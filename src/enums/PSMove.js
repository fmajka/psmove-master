const PSMove = {
    Btn_TRIANGLE: 1 << 4, /*!< Green triangle */
    Btn_CIRCLE: 1 << 5, /*!< Red circle */
    Btn_CROSS: 1 << 6, /*!< Blue cross */
    Btn_SQUARE: 1 << 7, /*!< Pink square */
    
    Btn_SELECT: 1 << 8, /*!< Select button, left side */
    Btn_START: 1 << 11, /*!< Start button, right side */
    
    Btn_PS: 1 << 16, /*!< PS button, front center */
    Btn_MOVE: 1 << 19, /*!< Move button, big front button */
    Btn_T: 1 << 20, /*!< Trigger, on the back */

    MAX_CONTROLLER_COUNT: 10,
};

export default PSMove;