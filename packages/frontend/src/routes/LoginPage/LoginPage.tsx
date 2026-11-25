import Button from "../../components/Button/Button";
import { Field, Input } from "../../components/Form";
import { UI_TEXT } from "../../constants/uiText";
import "./LoginPage.css";

export function LoginPage() {
  return (
    <div className="login-form">
      <h1>{UI_TEXT.login.title}</h1>
      <Field className="email-input" label={UI_TEXT.login.emailLabel} required>
        <Input
          type="email"
          placeholder={UI_TEXT.login.emailPlaceholder}
          autoComplete="email"
        />
      </Field>
      <Field
        className="pass-input"
        label={UI_TEXT.login.passwordLabel}
        required
        helperText="prova di helpertext"
        // error={UI_TEXT.errors.password}
      >
        <Input
          type="password"
          placeholder={UI_TEXT.login.passwordPlaceholder}
        />
      </Field>
      <Button
        className="login-btn"
        variant="primary"
        size="md"
        onClick={() => console.log("Richiesta auth")}
      >
        {UI_TEXT.login.enterBtn}
      </Button>
    </div>
  );
}

export default LoginPage;
