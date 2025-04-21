import type { CommandInfo, MacroInfo } from "./types";

export const macros: Record<string, MacroInfo> = {
    dynamic: {
        description: {
            zh: `设置动态偏移量的起始基准，编译器将从这里开始查找可用空间。`
        },
        hoisting: true,
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

export const commands: Record<string, CommandInfo> = {
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