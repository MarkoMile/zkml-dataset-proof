import { Dispatch, SetStateAction } from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    setValue: Dispatch<SetStateAction<string>>
    label?: string
    labelClass?: string
    wrapperClass?: string
    error?: string
    setError?: Dispatch<SetStateAction<string>>
    max?: number
    min?: number
}

export default function Input({ setValue, error, setError, label, labelClass, max, min, wrapperClass, ...props }: InputProps) {
    return (
        <div className={wrapperClass}>
            {label ? (
                <label
                    htmlFor={props.id}
                    className={`${error ? "text-red-600" : ""} ${labelClass || ""}`}
                >
                    {error ? (
                        error
                    ) : (
                        <div>
                            {label}
                            {props.required ? <span className="text-red-600">*</span> : ""}
                        </div>
                    )}
                </label>
            ) : (
                ""
            )}
            <input
                value={props.value}
                onChange={(e) => {
                    let value = e.target.value
                    if (props.type == "number") {
                        if (max && parseFloat(value) > max) {
                            if (setError) setError(`Value cant be higher than ${max}`)
                            return
                        }
                        if ((min || min == 0) && parseFloat(value) < min) {
                            if (setError) setError(`Value cant be lower than ${min}`)
                            return
                        }
                    }

                    setValue(value)
                    if (setError) setError("")
                }}
                onFocus={() => {
                    // if (setError) setError("")
                }}
                className={`${props.className} ${error ? "!border-red-600 placeholder:text-red-600" : ""}`}
                placeholder={props.placeholder}
                id={props.id}
                type={props.type}
                disabled={props.disabled}
                autoComplete={props.autoComplete}
                onKeyUp={props.onKeyUp}
            />
        </div>
    )
}
