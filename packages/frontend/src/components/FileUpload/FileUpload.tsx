import React from "react";
import { FileUpload as ArkFileUpload } from "@ark-ui/react/file-upload";
import { Camera, Trash2 } from "lucide-react";
import Button from "../Button/Button";
import "./FileUpload.css";

export interface FileUploadProps {
  label?: string;
  helperText?: string;
  triggerText?: string;
  onFileChange?: (file: File | null) => void;
  className?: string;
}

export function FileUpload({
  label,
  helperText,
  triggerText = "Scatta o scegli una foto",
  onFileChange,
  className = "",
}: FileUploadProps) {
  return (
    <ArkFileUpload.Root
      maxFiles={1}
      accept="image/*"
      onFileChange={(details) => {
        onFileChange?.(details.acceptedFiles[0] ?? null);
      }}
      className={`unibin-upload-root ${className}`}
    >
      {label && (
        <ArkFileUpload.Label className="unibin-upload-label">
          {label}
        </ArkFileUpload.Label>
      )}

      <ArkFileUpload.Context>
        {(api) => (
          <>
            {/* Mostra la dropzone solo se non c'è ancora una foto selezionata */}
            {api.acceptedFiles.length === 0 && (
              <ArkFileUpload.Dropzone className="unibin-upload-dropzone">
                <div className="unibin-upload-icon-wrap">
                  <Camera size={24} />
                </div>
                <ArkFileUpload.Trigger asChild>
                  <Button variant="neutral" size="sm">
                    {triggerText}
                  </Button>
                </ArkFileUpload.Trigger>
                {helperText && (
                  <span className="unibin-upload-helper">{helperText}</span>
                )}
              </ArkFileUpload.Dropzone>
            )}

            {/* Anteprima della foto selezionata/scattata */}
            <ArkFileUpload.ItemGroup className="unibin-upload-preview-group">
              {api.acceptedFiles.map((file) => (
                <ArkFileUpload.Item
                  key={file.name}
                  file={file}
                  className="unibin-upload-item"
                >
                  <ArkFileUpload.ItemPreview
                    type="image/*"
                    className="unibin-upload-preview"
                  >
                    <ArkFileUpload.ItemPreviewImage className="unibin-upload-preview-img" />
                  </ArkFileUpload.ItemPreview>

                  <div className="unibin-upload-item-bar">
                    <ArkFileUpload.ItemName className="unibin-upload-item-name" />
                    <ArkFileUpload.ItemDeleteTrigger asChild>
                      <Button
                        variant="icon"
                        size="sm"
                        className="unibin-upload-delete"
                        aria-label="Rimuovi foto"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </ArkFileUpload.ItemDeleteTrigger>
                  </div>
                </ArkFileUpload.Item>
              ))}
            </ArkFileUpload.ItemGroup>
          </>
        )}
      </ArkFileUpload.Context>

      <ArkFileUpload.HiddenInput />
    </ArkFileUpload.Root>
  );
}

export default FileUpload;
