import getFile from "@/utils/getFile";

import { Dispatch, SetStateAction } from "react";

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  file: File | undefined;
  setFile: Dispatch<SetStateAction<File | undefined>>;
  error?: string;
  setError?: Dispatch<SetStateAction<string>>;
}

export default function FileInput({
  error,
  setError,
  file,
  setFile,
  ...props
}: FileInputProps) {
  async function handleClick() {
    try {
      const file = await getFile("text/csv");
      setFile(file);
    } catch (error) {}
  }
  return (
    <div
      className={`primary-button w-fit ${props.className}`}
      onClick={handleClick}
    >
      Select csv file
    </div>
  );
}
