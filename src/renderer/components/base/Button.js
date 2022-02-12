import Block from './Block';

export default class Button extends Block {
  constructor({
    element = 'button',
    type = 'button',
    ...props
  } = {}) {
    super({
      element,
      type,
      ...props
    });
  }
}
