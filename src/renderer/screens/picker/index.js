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

  const pickerContent = setPickerContent();
  container.append(pickerContent);

  const costumePicker = new Block({
    className: 'costumes',
  });
  container.append(costumePicker);

  window.packs.getPackList();

  return container.element;
}
