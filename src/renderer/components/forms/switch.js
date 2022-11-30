import Block from "../base/Block"
import './forms.scss';

export default ({
  id,
  label,
  checked = false,
} = {
}) => {
  const container = new Block({
    className: 'form-element',
  });

  const labelEl = new Block({
    element: 'label',
    htmlFor: id,
    textContent: label,
  });
  container.append(labelEl);

  const inputLabel = new Block({
    element: 'label',
    className: 'form-switch',
  });
  container.append(inputLabel);

  const input = new Block({
    element: 'input',
    id,
    type: 'checkbox',
    checked,
  });
  inputLabel.append(input);

  const switchContainer = new Block({
    className: 'form-switch-container',
  });
  inputLabel.append(switchContainer);

  const switchToggle = new Block({
    className: 'form-switch-toggle',
  });
  switchContainer.append(switchToggle);

  container.onInput = (callback) => {
    input.on('input', callback);
  };

  Object.defineProperty(container, 'checked', {
    get: () => !!input.element.checked,
    set: (checked) => {
      input.element.checked = !!checked;
    },
  });

  return container;
}
