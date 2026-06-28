"use client";

import * as React from "react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { Slot } from "@radix-ui/react-slot";

import { Label } from "@/components/ui/label";

const Form = FormProvider;

const FormFieldContext = React.createContext<{ name: string }>({} as { name: string });

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  if (!fieldContext) {
    throw new Error("useFormField must be used within FormField");
  }
  const { formState } = useFormContext();
  const fieldState = formState.errors[fieldContext.name];
  return { name: fieldContext.name, error: fieldState };
};

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`space-y-2 ${className ?? ""}`} {...props} />
  )
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { name, error } = useFormField();
    return (
      <Label
        ref={ref}
        htmlFor={name}
        className={`${error ? "text-destructive" : ""} ${className ?? ""}`}
        {...props}
      />
    );
  }
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ElementRef<"div">, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { name, error } = useFormField();
    const { formDescriptionId, formMessageId } = React.useMemo(() => {
      const base = name;
      return {
        formDescriptionId: `${base}-description`,
        formMessageId: `${base}-message`,
      };
    }, [name]);

    return (
      <Slot
        ref={ref}
        id={name}
        aria-describedby={error ? `${formMessageId}` : `${formDescriptionId}`}
        aria-invalid={!!error}
        {...props}
      />
    );
  }
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { name } = useFormField();
    return (
      <p
        ref={ref}
        id={`${name}-description`}
        className={`text-sm text-muted-foreground ${className ?? ""}`}
        {...props}
      />
    );
  }
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { name, error } = useFormField();
    const body = error ? String(error.message ?? error) : children;
    if (!body) return null;
    return (
      <p
        ref={ref}
        id={`${name}-message`}
        className={`text-sm font-medium text-destructive ${className ?? ""}`}
        {...props}
      >
        {body}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };
