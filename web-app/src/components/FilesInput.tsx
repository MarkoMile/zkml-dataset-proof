import getFiles from "@/utils/getFiles";

import { Dispatch, SetStateAction } from "react";

interface FilesInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  error?: string;
  setError?: Dispatch<SetStateAction<string>>;
}

export default function FilesInput({
  error,
  setError,
  files,
  setFiles,
  ...props
}: FilesInputProps) {
  async function handleClick() {
    try {
      const files = await getFiles("application/pdf");
      setFiles(files);
    } catch (error) {}
  }
  return (
    <div
      className={`primary-button w-fit ${props.className}`}
      onClick={handleClick}
    >
      <FontAwesomeIcon icon={faFileUpload} /> Select files
    </div>
  );
}
