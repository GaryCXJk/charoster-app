import titlebar from '@components/titlebar';
import "./setup.scss";

export default () => {
  const data = {
    choice: 'appdata',
    customChoice: '',
  };
  const eventTarget = new EventTarget;

  const setCustomChoice = async () => {
    if (!data.customChoice) {
      data.customChoice = await window.config.getWorkFolder('documents');
      eventTarget.dispatchEvent(new Event('custom-choice-set'));
    }
  };

  setCustomChoice();

  const createChoice = (options = {}) => {
    const {
      default: isDefault = false,
      label: text = '',
      value,
    } = options;
    const container = document.createElement('div');
    container.className = 'choice';

    const label = document.createElement('label');
    container.appendChild(label);

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'setup';
    radio.value = value,
    radio.checked = isDefault;
    label.appendChild(radio);

    label.appendChild(document.createTextNode(` ${text}`));

    radio.addEventListener('input', () => {
      data.choice = value;
      eventTarget.dispatchEvent(new CustomEvent('changed', {
        value,
      }));
    });

    return container;
  }

  const createContent = () => {
    const content = document.createElement('div');
    content.className = 'content';

    const lines = [
      'Choose a working folder.',
      'All working files, like images and saved data, will be stored here. You can change it later.',
    ];

    lines.forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      content.appendChild(p);
    });

    const appDataChoice = createChoice({
      default: true,
      label: 'App data folder',
      value: 'appdata',
    });
    content.appendChild(appDataChoice);

    const documentsChoice = createChoice({
      label: 'Documents folder',
      value: 'documents',
    });
    content.appendChild(documentsChoice);

    const customChoice = createChoice({
      label: 'Custom folder',
      value: 'custom',
    });
    content.appendChild(customChoice);

    const customChoiceContainer = document.createElement('div');
    customChoiceContainer.className = 'custom-choice';

    const customChoiceMain = document.createElement('div');
    customChoiceMain.className = 'custom-choice-input';
    customChoiceContainer.appendChild(customChoiceMain);

    const customChoiceInput = document.createElement('input');
    customChoiceInput.disabled = data.choice !== 'custom';
    customChoiceMain.appendChild(customChoiceInput);

    customChoiceInput.addEventListener('input', () => {
      data.customChoice = customChoiceInput.value;
    });

    const customChoiceBtn = document.createElement('button');
    customChoiceBtn.type = 'button';
    customChoiceBtn.textContent = 'Choose...';
    customChoiceBtn.disabled = data.choice !== 'custom';
    customChoiceContainer.appendChild(customChoiceBtn);

    customChoice.appendChild(customChoiceContainer);

    customChoiceBtn.addEventListener('click', async () => {
      const pick = await window.config.pickFolder(data.customChoice);
      if (!pick.cancelled) {
        data.customChoice = pick.filePaths[0];
      }
      eventTarget.dispatchEvent(new Event('custom-choice-set'));
    });

    eventTarget.addEventListener('changed', () => {
      customChoiceInput.disabled = data.choice !== 'custom';
      customChoiceBtn.disabled = data.choice !== 'custom';
    });

    eventTarget.addEventListener('custom-choice-set', () => {
      customChoiceInput.value = data.customChoice;
    });

    return content;
  }

  const container = document.createElement('div');
  container.className = 'sections';

  container.appendChild(titlebar({
    title: 'Work folder',
    closable: false,
  }).element);

  const content = createContent();
  container.appendChild(content);

  const footer = document.createElement('div');
  footer.className = 'footer';
  container.appendChild(footer);

  const pickBtn = document.createElement('button');
  pickBtn.textContent = 'Save';
  footer.appendChild(pickBtn);

  pickBtn.addEventListener('click', async () => {
    await window.config.setWorkFolder(data);
    window.curWin.close();
  });

  return container;
}
