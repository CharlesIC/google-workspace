import {Config} from "jest";
import baseConfig from "../../jest.config.base";

export default {
    ...baseConfig,
    displayName: "library"
} satisfies Config;
