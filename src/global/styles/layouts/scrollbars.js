export const getDefaultHorizontalScrollbarLayout = () => ([
]);

export const getDefaultVerticalScrollbarLayout = () => ([
]);

export const getDefaultScrollbarLayout = () => ([
    {
        type: 'container',
        filters: [
            {
                type: 'option',
                field: 'direction',
                value: 'horizontal',
            },
        ],
        layers: [
            ...getDefaultHorizontalScrollbarLayout(),
        ]
    },
    {
        type: 'container',
        filters: [
            {
                type: 'option',
                field: 'direction',
                value: 'vertical',
            },
        ],
        layers: [
            ...getDefaultVerticalScrollbarLayout(),
        ]
    },
]);