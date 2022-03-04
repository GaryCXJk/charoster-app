export default class Block {
  #element;
  #props;
  #container;
  #on = {};

  constructor({
    element = 'div',
    on = {},
    ...props
  } = {}) {
    this.#element = element;
    this.#props = props;

    this.createDOM();
    this.on(on);
  }

  createDOM() {
    this.#container = document.createElement(this.#element);
    Object.assign(this.#container, this.#props);
  }

  assign(props) {
    Object.assign(this.#props, props);
    Object.assign(this.#container, props);
  }

  prop(prop, value = undefined) {
    if (typeof value === 'undefined') {
      return this.#props[prop];
    }
    this.#props[prop] = value;
    this.#container[prop] = value;
  }

  css(style) {
    this.#props.style = this.#props.style ?? {};
    Object.assign(this.#props.style, style);
    Object.assign(this.#container.style, style);
  }

  append(block) {
    if (typeof block === 'string') {
      this.#container.appendChild(document.createTextNode(block));
    } else if(block instanceof Block) {
      this.#container.appendChild(block.element);
    } else if (block instanceof HTMLCollection) {
      Array.from(block).forEach((node) => {
        this.#container.appendChild(node);
      });
    } else {
      this.#container.appendChild(block);
    }
  }

  insertBefore(block) {
    if (block instanceof HTMLCollection) {
      Array.from(block).forEach((node) => {
        this.insertBefore(node);
      });
      return;
    }

    let element = block;
    if (typeof block === 'string') {
      element = document.createTextNode(block);
    } else if (block instanceof Block) {
      element = block.element;
    }

    this.#container.parentNode.insertBefore(element, this.#container);
  }

  appendChildren(block) {
    if (block instanceof Block) {
      this.append(block.element.children);
    }
  }

  detach() {
    if (this.#container.parentNode) {
      this.#container.parentNode.removeChild(this.#container);
    }
  }

  empty() {
    Array.from(this.#container.children).forEach((child) => {
      this.#container.removeChild(child);
    });
  }

  index() {
    if (this.#container.parentNode) {
      const { parentNode } = this.#container;
      return Array.from(parentNode.children).indexOf(this.#container);
    }
    return -1;
  }

  on(event, callback = null) {
    if (typeof event === 'object') {
      Object.keys(event).forEach((eventKey) => {
        const eventCallback = event[eventKey];
        this.on(eventKey, eventCallback);
      });
    } else {
      this.#on[event] = this.#on[event] ?? [];
      this.#on[event].push(callback);
      this.#container.addEventListener(event, callback);
    }
  }

  get element() {
    return this.#container;
  }
}
