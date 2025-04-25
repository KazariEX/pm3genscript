export type ArgumentType = "byte" | "word" | "dword" | "pointer" | "number" | "string" | "identifier" | "symbol";

export interface MacroTemplate {
    alias?: string[];
    description?: Partial<Record<"en" | "zh", string>>;
    example?: {
        content: string;
        description?: string;
    };
    arguments?: MacroArgumentTemplate[];
}

export interface MacroArgumentTemplate {
    name: string;
    enum?: any[];
    type?: ArgumentType | ArgumentType[];
    can?: {
        dynamic?: boolean;
        symbol?: boolean;
    };
}

export interface CommandTemplate {
    value?: number;
    description?: Partial<Record<"en" | "zh", string>>;
    ending?: boolean;
    bytes?: number;
    arguments?: CommandArgumentTemplate[];
}

export interface CommandArgumentTemplate {
    name: string;
    type: ArgumentType;
    description?: string;
    when?: (args: any[]) => boolean;
}