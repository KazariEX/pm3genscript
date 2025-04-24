import type { CommandTemplate, MacroTemplate } from "./types";

export const macros: Record<string, MacroTemplate | {
    redirect: string;
}> = {
    break: {
        alias: ["stop"],
        description: {
            zh: `当编译器到达该指令时，它将停止处理脚本的剩余部分。在调试脚本时很有用。`
        },
        example: {
            content: "#break"
        }
    },
    define: {
        alias: ["const"],
        description: {
            zh: `
            \n允许我们在编译脚本时定义可以替换数字的符号。
            \n必须使用大写字母或下划线作为符号名称，替换的数字可以是从字节到双字的任何大小。`
        },
        arguments: [
            {
                name: "symbol",
                type: "symbol"
            },
            {
                name: "value",
                type: ["byte", "word", "dword"],
                can: {
                    symbol: false
                }
            }
        ],
        example: {
            content: "#define LASTRESULT 0x800D",
            description: "在这个例子中，我们定义了一个叫做 LASTRESULT 的符号，它的值为 0x800D。"
        }
    },
    dynamic: {
        description: {
            zh: `设置动态偏移量的起始基准，编译器将从这里开始查找可用空间。`
        },
        arguments: [
            {
                name: "offset",
                type: "pointer",
                can: {
                    dynamic: false
                }
            }
        ],
        example: {
            content: "#dynamic 0x720000",
            description: "在这个例子中，编译器将从 0x720000 开始向下查找可用空间。"
        }
    },
    org: {
        alias: ["seek"],
        description: {
            zh: `
            \n告诉编译器从哪里开始在ROM中编写脚本，可以使用静态或动态偏移：
            \n在第一种情况下，指定的位置和编译器使用的偏移量一致；
            \n在后一种情况下，编译器将自动计算偏移量，并根据可用空间进行分配。
            \n最明显的区别是，静态偏移填入一个实数，而动态偏移使用以 "@" 开头的标签。`
        },
        arguments: [
            {
                name: "offset",
                type: "pointer"
            }
        ],
        example: {
            content: `
            \n#org 0x800000
            \n#org @main`,
            description: "在第一个例子中，我们选择从 0x800000 开始书写脚本；在第二个例子中，我们使用了一个名为 main 的动态标签来获取合适的偏移量。"
        }
    }
};

export const commands: Record<string, CommandTemplate | {
    redirect: string;
}> = {
    "=": {
        description: {
            zh: `
            \n原始文本插入器。
            \n使用这个指令，可以将任何文本写入 ROM，文本会被 ROM 自动转换为正确的十六进制数据。`
        },
        arguments: [
            {
                name: "text",
                type: "string"
            }
        ]
    },
    end: {
        value: 0x02,
        description: {
            en: `Ends the execution of the script.`,
            zh: `结束脚本的执行。`
        },
        bytes: 1,
        ending: true
    },
    trainerbattle: {
        value: 0x5C,
        description: {
            en: `Starts a trainer battle. Depending on the kind of battle, last parameters may differ.`,
            zh: `
            \n进入训练师对战。
            \n如果训练师被击败，则将训练师 flag 设置为存在；
            \n当训练师 flag 存在时，指令不生效。`
        },
        bytes: 14,
        arguments: [
            {
                name: "kind",
                type: "byte",
                description: "Kind of battle"
            },
            {
                name: "trainer",
                type: "word",
                description: "Trainer # to battle"
            },
            {
                name: "reserved",
                type: "word",
                description: "Reserved"
            },
            {
                name: "offset",
                type: "pointer",
                description: "Pointer to the challenge text"
            },
            {
                name: "offset",
                type: "pointer",
                description: "Pointer to the defeat text",
                when: (args) => args[0] !== 0x3
            },
            {
                name: "offset",
                type: "pointer",
                description: "Pointer",
                when: (args) => [0x1, 0x2, 0x4, 0x6, 0x8].includes(args[0])
            },
            {
                name: "offset",
                type: "pointer",
                description: "Pointer",
                when: (args) => [0x6, 0x8].includes(args[0])
            }
        ]
    },
    msgbox: {
        description: {
            en: `Loads a pointer into memory to display a message later on.`,
            zh: `显示指定类型的对话框。`
        },
        bytes: 8,
        arguments: [
            {
                name: "offset",
                type: "pointer",
                description: "Pointer to load into memory"
            },
            {
                name: "type",
                type: "byte",
                description: "Message type"
            }
        ]
    }
};