#include <stdio.h>
#include <stdlib.h>
#include <psmove.h>
#include <psmove_tracker.h>
#include <psmove_fusion.h>
#include <assert.h>

int main() {
    PSMove *move = psmove_connect();
    if(!move) {
        fprintf(stderr, "Could not connect to PSMove controller.\n");
        return 1;
    }

    PSMoveTracker *tracker = psmove_tracker_new();
    if(!tracker) {
        fprintf(stderr, "Could not initialize PSMove tracker.\n");
        return 1;
    }

    PSMoveFusion *fusion = psmove_fusion_new(tracker, 0.1, 500);
    if(!fusion) {
        fprintf(stderr, "Could not initialize PSMove fusion.\n");
        return 1;
    }

    psmove_enable_orientation(move, true);
    psmove_set_orientation_fusion_type(move, OrientationFusion_ComplementaryMARG);
    assert(psmove_has_orientation(move));

    while(psmove_tracker_enable(tracker, move) != Tracker_CALIBRATED) {
        printf("Tring to calibrate tracker...\n");
    }

    while(1) {
        psmove_tracker_update_image(tracker);
        psmove_tracker_update(tracker, NULL);

        while(psmove_poll(move));

        if(psmove_get_buttons(move) & Btn_PS) {
            printf("PS Button pressed, playtime is over!\n");
            fflush(stdout);
            break;
        }

        if(psmove_get_buttons(move) & Btn_SELECT) {
            psmove_reset_orientation(move);
            printf("Reset orientation\n");
            fflush(stdout);
        }

        float x, y, z;
        psmove_fusion_get_position(fusion, move, &x, &y, &z);
        unsigned int buttons = psmove_get_buttons(move);
        unsigned char trigger = psmove_get_trigger(move);
        float rw, rx, ry, rz;
        psmove_get_orientation(move, &rw, &rx, &ry, &rz);

        printf("update %.2f %.2f %.2f %u %d %.2f %.2f %.2f %.2f\n", x, y, z, buttons, trigger, rw, rx, ry, rz);
        fflush(stdout);
    }

    psmove_disconnect(move);
    psmove_tracker_free(tracker);
    return 0;
}
