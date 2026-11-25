import React, { useState } from "react";
import { Field as ArkField } from "@ark-ui/react/field";
import { Eye, EyeOff, Search, X } from "lucide-react";
import "./Input.css";

type BaseInputProps = {
  className?: string;
  wrapperClassName?: string;
};

export type SingleLineInputProps = BaseInputProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    multiline?: false;
    type?: "text" | "email" | "password" | "search";
    onClear?: () => void;
  };

export type MultiLineInputProps = BaseInputProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

export type InputProps = SingleLineInputProps | MultiLineInputProps;

export function Input(props: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Variante Textarea
  if (props.multiline) {
    const {
      multiline: _multiline,
      className = "",
      wrapperClassName: _w,
      rows = 3,
      ...textareaProps
    } = props;
    return (
      <ArkField.Textarea
        rows={rows}
        className={`unibin-input unibin-textarea ${className}`}
        {...textareaProps}
      />
    );
  }

  // Variante Input a riga singola
  const {
    multiline: _multiline,
    type = "text",
    className = "",
    wrapperClassName = "",
    onClear,
    ...inputProps
  } = props;

  const isPassword = type === "password";
  const isSearch = type === "search";
  const resolvedType = isPassword && showPassword ? "text" : type;
  const hasValue = Boolean(
    inputProps.value && String(inputProps.value).length > 0,
  );

  return (
    <div
      className={`unibin-input-wrapper ${wrapperClassName}`}
      data-type={type}
    >
      {isSearch && (
        <span
          className="unibin-input-icon unibin-input-icon--left"
          aria-hidden="true"
        >
          <Search size={16} />
        </span>
      )}

      <ArkField.Input
        type={resolvedType}
        className={`unibin-input ${className}`}
        {...inputProps}
      />

      {isPassword && (
        <button
          type="button"
          className="unibin-input-action"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Nascondi password" : "Mostra password"}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}

      {isSearch && hasValue && onClear && (
        <button
          type="button"
          className="unibin-input-action"
          onClick={onClear}
          aria-label="Cancella ricerca"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default Input;
