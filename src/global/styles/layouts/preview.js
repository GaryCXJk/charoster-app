export const getDefaultPreviewLayout = () => ([
    {
        type: "container",
        layers: [
            {
                type: "image",
                size: [
                    "preview"
                ],
            },
            {
                type: 'label',
                display: 'image',
            },
        ],
    },
    {
        type: "container",
        layers: [
            {
                type: "label",
                text: "Credits",
                display: 'heading',
                depth: 2,
            },
            {
                type: "information",
                value: "credits",
            },
        ],
    },
    {
        type: "container",
        layers: [
            {
                type: "label",
                text: "Description",
                display: 'heading',
                depth: 2,
            },
            {
                type: "information",
                value: "description",
            },
        ],
    },
]);
