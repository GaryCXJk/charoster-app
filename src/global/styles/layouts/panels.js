export const getDefaultPanelLayout = () => ([
  {
    type: 'image',
    size: ['panel', 'preview'],
  },
  {
    type: 'label',
    display: 'image',
    filters: [
      {
        type: 'or',
        filters: [
          {
            type: 'window',
            comparison: 'is',
            value: 'picker',
          },
          {
            type: 'meta',
            field: 'label',
            comparison: 'not-equals',
            value: false,
          },
        ],
      }
    ],
  },
  {
    type: "image",
    filters: [
      {
        type: 'or',
        filters: [
          {
            type: 'window',
            comparison: 'is',
            value: 'picker',
          },
          {
            type: 'meta',
            field: 'label',
            comparison: 'not-equals',
            value: false,
          },
        ],
      }
    ],
    from: {
      definition: 'franchise',
      field: 'symbols',
    },
    color: '#fff',
    style: {
      element: {
        width: '2em',
        height: '2em',
        right: '-0.75em',
        bottom: '-0.75em',
      },
    },
  },
]);
