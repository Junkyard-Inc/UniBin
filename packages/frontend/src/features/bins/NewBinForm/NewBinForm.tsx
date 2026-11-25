import { Field, Input } from "../../../components/Form";

export function NewBinForm() {
  return (
    <div>
      <Field label="Label">
        <Input type="text" placeholder="Prova" />
      </Field>
      <Field label="password">
        <Input type="password" placeholder="inserire password" />
      </Field>
    </div>
  );
}

export default NewBinForm;
