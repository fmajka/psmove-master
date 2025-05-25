#include "PSMoveClient_CAPI.h"
#include "ClientConstants.h"
#include <iostream>
#include <iomanip>
#include <chrono>
#include <cstring>

#include <stdio.h>

#if defined(__linux) || defined (__APPLE__)
#include <unistd.h>
#endif

#ifdef _WIN32
#include <windows.h>
#endif

#define FPS_REPORT_DURATION 500 // ms

enum PSMove_Button {
    Btn_TRIANGLE = 1 << 4, /*!< Green triangle */
    Btn_CIRCLE = 1 << 5, /*!< Red circle */
    Btn_CROSS = 1 << 6, /*!< Blue cross */
    Btn_SQUARE = 1 << 7, /*!< Pink square */
    
    Btn_SELECT = 1 << 8, /*!< Select button, left side */
    Btn_START = 1 << 11, /*!< Start button, right side */
    
    Btn_PS = 1 << 16, /*!< PS button, front center */
    Btn_MOVE = 1 << 19, /*!< Move button, big front button */
    Btn_T = 1 << 20, /*!< Trigger, on the back */
};

#define BTNBIT(button, bit) (button ? bit : 0)

class PSMoveConsoleClient {
    public:
    PSMoveConsoleClient() 
    : m_keepRunning(true) {
        memset(&controllerList, 0, sizeof(PSMControllerList));
        memset(&trackerList, 0, sizeof(PSMTrackerList));
        memset(&hmdList, 0, sizeof(PSMHmdList));
    }
    
    int run() {
        // Attempt to start and run the client
        try  {
            if (startup()) {
                while (m_keepRunning) {
                    update();
                    
                    _PAUSE(1);
                }
            }
            else {
                std::cerr << "Failed to startup the PSMove Client" << std::endl;
            }
        }
        catch (std::exception& e)  {
            std::cerr << e.what() << std::endl;
        }
        
        // Attempt to shutdown the client
        try  {
            shutdown();
        }
        catch (std::exception& e)  {
            std::cerr << e.what() << std::endl;
        }
        
        return 0;
    }
    
    private:
    // PSMoveConsoleClient
    bool startup() {
        bool success= true;
        
        // Attempt to connect to the server
        if (success) {
            if (PSM_Initialize(PSMOVESERVICE_DEFAULT_ADDRESS, PSMOVESERVICE_DEFAULT_PORT, PSM_DEFAULT_TIMEOUT) == PSMResult_Success) {
                std::cout << "PSMoveConsoleClient::startup() - Initialized client version - " << PSM_GetClientVersionString() << std::endl;
            }
            else {
                std::cout << "PSMoveConsoleClient::startup() - Failed to initialize the client network manager" << std::endl;
                success= false;
            }
            
            if (success) {
                rebuildControllerList();
                rebuildTrackerList();
                rebuildHmdList();
                
                // Register as listener and start stream for each controller
                unsigned int data_stream_flags = 
                PSMControllerDataStreamFlags::PSMStreamFlags_includePositionData |
                PSMControllerDataStreamFlags::PSMStreamFlags_includePhysicsData | 
                PSMControllerDataStreamFlags::PSMStreamFlags_includeCalibratedSensorData |
                PSMControllerDataStreamFlags::PSMStreamFlags_includeRawTrackerData;
                
                if (controllerList.count > 0) {
                    if (PSM_AllocateControllerListener(controllerList.controller_id[0]) != PSMResult_Success) {
                        success= false;
                    }
                    if (PSM_StartControllerDataStream(controllerList.controller_id[0], data_stream_flags, PSM_DEFAULT_TIMEOUT) != PSMResult_Success) {
                        success= false;
                    }
                } else {
                    std::cout << "PSMoveConsoleClient::startup() - No controllers found." << std::endl;
                    success = false;
                }
            }
        }
        
        if (success) {
            last_report_fps_timestamp= 
            std::chrono::duration_cast< std::chrono::milliseconds >( 
                std::chrono::system_clock::now().time_since_epoch() 
            );
        }
        
        return success;
    }
    
    void update() {
        std::chrono::milliseconds now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch());
        std::chrono::milliseconds diff= now - last_report_fps_timestamp;
        
        // Polls events and updates controller state
        if (PSM_Update() != PSMResult_Success) {
            m_keepRunning= false;
        }
        
        // See if we need to rebuild the controller list
        if (m_keepRunning && PSM_HasControllerListChanged()) {
            unsigned int data_stream_flags = 
            PSMControllerDataStreamFlags::PSMStreamFlags_includePositionData |
            PSMControllerDataStreamFlags::PSMStreamFlags_includePhysicsData | 
            PSMControllerDataStreamFlags::PSMStreamFlags_includeCalibratedSensorData |
            PSMControllerDataStreamFlags::PSMStreamFlags_includeRawTrackerData;
            
            // Stop all controller streams
            PSM_StopControllerDataStream(controllerList.controller_id[0], PSM_DEFAULT_TIMEOUT);
            
            // Get the current controller list
            rebuildControllerList();
            
            // Restart the controller streams
            if (controllerList.count > 0) {
                if (PSM_StartControllerDataStream(controllerList.controller_id[0], data_stream_flags, PSM_DEFAULT_TIMEOUT) != PSMResult_Success) {
                    m_keepRunning= false;
                }
            } else {
                std::cout << "PSMoveConsoleClient::startup() - No controllers found." << std::endl;
                m_keepRunning = false;
            }
        }
        
        // See if we need to rebuild the tracker list
        if (m_keepRunning && PSM_HasTrackerListChanged()) {
            rebuildTrackerList();
        }
        
        // See if we need to rebuild the hmd list
        if (m_keepRunning && PSM_HasHMDListChanged()) {
            rebuildTrackerList();
        }
        
        // Get the controller data for the first controller
        if (m_keepRunning) {
            for(int i = 0; i < controllerList.count; i++) {
                PSMController *controller = PSM_GetController(controllerList.controller_id[i]);
                PSMPSMove state = controller->ControllerState.PSMoveState;
                unsigned int buttons = 0
                | BTNBIT(state.TriangleButton, Btn_TRIANGLE)
                | BTNBIT(state.CircleButton, Btn_CIRCLE)
                | BTNBIT(state.CrossButton, Btn_CROSS)
                | BTNBIT(state.SquareButton, Btn_SQUARE)
                | BTNBIT(state.SelectButton, Btn_SELECT)
                | BTNBIT(state.StartButton, Btn_START)
                | BTNBIT(state.PSButton, Btn_PS)
                | BTNBIT(state.MoveButton, Btn_MOVE)
                | BTNBIT(state.TriggerButton, Btn_T);
                unsigned char trigger = state.TriggerValue;
                
                printf("move_update %d %f %f %f %f %f %f %f %d %d\n", 
                    i,
                    state.Pose.Position.x, 
                    state.Pose.Position.y, 
                    state.Pose.Position.z,
                    state.Pose.Orientation.w,
                    state.Pose.Orientation.x,
                    state.Pose.Orientation.y,
                    state.Pose.Orientation.z,
                    buttons,
                    trigger
                );
                fflush(stdout);
            }
            // PSMController *controller0 = PSM_GetController(controllerList.controller_id[0]);
            // PSMPosef pose = controller0->ControllerState.PSMoveState.Pose;
            
            //std::cout << "Controller 0 (XYZ, QWQXQYQZ):  ";
            
            //PSMVector3f position = controller0->ControllerState.PSMoveState.RawTrackerData.RelativePositionCm;
            
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Position.x;
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Position.y;
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Position.z;
            
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Orientation.w;
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Orientation.x;
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Orientation.y;
            //std::cout << std::setw(12) << std::right << std::setprecision(6) << pose.Orientation.z;
            
            //std::cout << std::endl;
            
            // int reset = controller0->ControllerState.PSMoveState.MoveButton != PSMButtonState_UP;
            
            // printf("move_update %d %f %f %f %f %f %f %f %d\n", 
            // 	0,
            // 	pose.Position.x, 
            // 	pose.Position.y, 
            // 	pose.Position.z,
            // 	pose.Orientation.w,
            // 	pose.Orientation.x,
            // 	pose.Orientation.y,
            // 	pose.Orientation.z,
            //     reset);
            // fflush(stdout);
        }
    }
    
    void shutdown() {
        if (controllerList.count > 0) {
            PSM_StopControllerDataStream(controllerList.controller_id[0], PSM_DEFAULT_TIMEOUT);
            PSM_FreeControllerListener(controllerList.controller_id[0]);
        }
        // No tracker data streams started
        // No HMD data streams started
        
        PSM_Shutdown();
    }
    
    void rebuildControllerList() {
        memset(&controllerList, 0, sizeof(PSMControllerList));
        PSM_GetControllerList(&controllerList, PSM_DEFAULT_TIMEOUT);
        
        std::cout << "Found " << controllerList.count << " controllers." << std::endl;
        
        for (int cntlr_ix=0; cntlr_ix<controllerList.count; ++cntlr_ix)  {
            const char *controller_type= "NONE";
            
            switch (controllerList.controller_type[cntlr_ix]) {
                case PSMController_Move:
                controller_type= "PSMove";
                break;
                case PSMController_Navi:
                controller_type= "PSNavi";
                break;
                case PSMController_DualShock4:
                controller_type= "DualShock4";
                break;
                case PSMController_Virtual:
                controller_type= "Virtual";
                break;
            }
            
            std::cout << "  Controller ID: " << controllerList.controller_id[cntlr_ix] << " is a " << controller_type << std::endl;
        }
    }
    
    void rebuildTrackerList() {
        memset(&trackerList, 0, sizeof(PSMTrackerList));
        PSM_GetTrackerList(&trackerList, PSM_DEFAULT_TIMEOUT);
        
        std::cout << "Found " << trackerList.count << " trackers." << std::endl;
        
        for (int tracker_ix=0; tracker_ix<trackerList.count; ++tracker_ix)  {
            const char *tracker_type= "NONE";
            
            switch (trackerList.trackers[tracker_ix].tracker_type) {
                case PSMTracker_PS3Eye:
                tracker_type= "PS3Eye";
                break;
            }
            
            std::cout << "  Tracker ID: " << trackerList.trackers[tracker_ix].tracker_id << " is a " << tracker_type << std::endl;
        }
    }
    
    void rebuildHmdList() {
        memset(&hmdList, 0, sizeof(PSMHmdList));
        PSM_GetHmdList(&hmdList, PSM_DEFAULT_TIMEOUT);
        
        std::cout << "Found " << hmdList.count << " HMDs." << std::endl;
        
        for (int hmd_ix=0; hmd_ix<hmdList.count; ++hmd_ix)  {
            const char *hmd_type= "NONE";
            
            switch (hmdList.hmd_type[hmd_ix]) {
                case PSMHmd_Morpheus:
                hmd_type= "Morpheus";
                break;
                case PSMHmd_Virtual:
                hmd_type= "Virtual";
                break;
            }
            
            std::cout << "  HMD ID: " << hmdList.hmd_id[hmd_ix] << " is a " << hmd_type << std::endl;
        }
    }
    
    private:
    bool m_keepRunning;
    std::chrono::milliseconds last_report_fps_timestamp;
    PSMControllerList controllerList;
    PSMTrackerList trackerList;
    PSMHmdList hmdList;
};

int main(int argc, char *argv[]) {   
    PSMoveConsoleClient app;
    
    // app instantiation
    return app.run();
}

