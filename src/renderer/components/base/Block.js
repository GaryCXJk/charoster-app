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

  append(block) {
    if(block instanceof Block) {
      this.#container.appendChild(block.element);
    } else {
      this.#container.appendChild(block);
    }
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
