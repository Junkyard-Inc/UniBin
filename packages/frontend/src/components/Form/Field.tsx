import React from "react";
import { Field as ArkField } from "@ark-ui/react";
import "./Field.css";

type FieldType = "select" | "text" | "textarea" | "checkbox";
type InputType = "text" | "email" | "number" | "password" | "search";

interface InputProps {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field(props: InputProps) {
  const isInvalid = props.invalid ?? Boolean(props.error);

  return (
    <ArkField.Root
      invalid={isInvalid}
      required={props.required}
      disabled={props.disabled}
      readOnly={props.readOnly}
      className={`unibin-field ${props.className}`}
    >
      {props.label && (
        <ArkField.Label className="unibin-field-label">
          {props.label}
          {props.required && (
            <ArkField.RequiredIndicator className="unibin-field-required">
              *
            </ArkField.RequiredIndicator>
          )}
        </ArkField.Label>
      )}

      {props.children}

      {props.helperText && !isInvalid && (
        <ArkField.HelperText className="unibin-field-helper">
          {props.helperText}
        </ArkField.HelperText>
      )}

      {props.error && (
        <ArkField.ErrorText className="unibin-field-error">
          {props.error}
        </ArkField.ErrorText>
      )}
    </ArkField.Root>
  );
}

export default Field;
