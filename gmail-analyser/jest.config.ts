import {Config} from "jest";
import baseConfig from "../jest.config.base";

export default {
    ...baseConfig,
    displayName: "gmail-analyser",
    // setupFiles: ["<rootDir>/../src/optional.ts"]
} satisfies Config;
