export default function getFile(types = ""): Promise<File> {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = types;
  input.multiple = false;
  input.click();

  return new Promise((res, rej) => {
    input.onchange = () => {
      if (!input.files) return rej("User aborted action");
      return res(Array.from(input.files)[0]);
    };
  });
}
