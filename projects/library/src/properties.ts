export namespace Properties {
    type Properties = GoogleAppsScript.Properties.Properties;

    export function get(properties: Properties, name: string): string | null;
    export function get(properties: Properties, name: string, defaultValue: string): string
    export function get(properties: Properties, name: string, defaultValue?: string): string | null {
        Logger.log(JSON.stringify(PropertiesService.getUserProperties().getProperties()));
        let value = properties.getProperty(name);

        if (!value && defaultValue) {
            value = defaultValue;
            properties.setProperty(name, value);
        }

        return value;
    }

    export function set(properties: Properties, name: string, value: string): string {
        properties.setProperty(name, value);
        return value;
    }
}
