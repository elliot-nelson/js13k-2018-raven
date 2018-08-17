const Util = {
    angleWithin(angle, b1, b2) {
        return dw(angle - b1) < dw(b2 - b1);
    }
};
