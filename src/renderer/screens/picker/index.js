import Block from "@components/base/Block";
import titlebar from "../../components/titlebar";
import setPickerContent from "./picker-content";
import './picker.scss';

export default () => {
  const container = new Block({
    className: 'sections',
  });

  container.append(titlebar({
    title: 'Picker',
    closable: false,
    minimizable: false,
  }));

  const altPicker = new Block({
    className: 'alts',
  });

  const pickerContent = setPickerContent(altPicker);
  container.append(pickerContent);

  container.append(altPicker);

  window.packs.getPackList();

  return container.element;
}
