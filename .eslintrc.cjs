module.exports = {
    root: true,
    ignorePatterns: ["node_modules"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    plugins: ["@typescript-eslint"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        tsconfigRootDir: "./",
        ecmaVersion: "latest",
        project: ["./tsconfig.eslint.json", "projects/**/tests/tsconfig.json"]
    },
    rules: {
        "no-inner-declarations": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-unused-vars": "off"
    }
};
