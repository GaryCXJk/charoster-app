export default [
  {
    type: "image",
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
    type: "credits",
    layers: [
      {
        type: "header",
        label: "Credits"
      },
      {
        type: "content"
      }
    ]
  },
  {
    type: "information",
    layers: [
      {
        type: "header",
        label: "Description"
      },
      {
        type: "content",
        value: "description"
      }
    ]
  }
];
