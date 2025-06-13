import { object, string, TypeOf } from "zod";
import { useEffect } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormInput from "../components/FormInput";
import { LoadingButton } from "../components/LoadingButton";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import useStore from "../store";

const resetPasswordSchema = object({
  password: string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  passwordConfirm: string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "Passwords do not match",
});

export type ResetPasswordInput = TypeOf<typeof resetPasswordSchema>;

const ResetPasswordPage = () => {
    const store = useStore();
    const navigate = useNavigate();
    const { passwordResetToken } = useParams();

    const resetPasswordUser = async (data: ResetPasswordInput) => {
        try {
            store.setRequestLoading(true);
            const VITE_SERVER_ENDPOINT = import.meta.env.VITE_SERVER_ENDPOINT;
            const response = await fetch(
                `${VITE_SERVER_ENDPOINT}/api/auth/resetpassword/${passwordResetToken}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    body: JSON.stringify(data),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            // const resData = await resetPasswordFn(data, passwordResetToken!);
            if (response.ok) {
              const resData = await response.json();
              toast.success(resData?.message || "Password reset successful", {
                position: "top-right",
              });
              store.setRequestLoading(false);
              navigate("/login");
              return resData;
            } else {
              const errorData = await response.json();
              store.setRequestLoading(false);
              toast.error(errorData?.message || "Failed to reset password", {
                position: "top-right",
              });
              throw new Error(errorData?.message || "Failed to reset password");
            }
        } catch (error: any) {
            store.setRequestLoading(false);
            if (error.error && Array.isArray(error.error)) {
                error.error.forEach((err: any) => {
                    toast.error("Failed to Reset Password", {
                        position: "top-right",
                    });
                });
                return;
            }
            const resMessage =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();

            toast.error(resMessage, {
                position: "top-right",
            });
        }
    };

    const methods = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const {
        reset,
        handleSubmit,
        formState: { isSubmitSuccessful },
    } = methods;

    useEffect(() => {
        if (isSubmitSuccessful) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitSuccessful]);

    const onSubmitHandler: SubmitHandler<ResetPasswordInput> = (values) => {
        resetPasswordUser(values);
    };

  return (
    <section className="bg-ct-blue-600 min-h-screen grid place-items-center">
      <div className="w-full">
        <h1 className="text-4xl lg:text-6xl text-center font-[600] text-ct-yellow-600 mb-14">
          Reset Password
        </h1>
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmitHandler)}
            className="max-w-md w-full mx-auto overflow-hidden shadow-lg bg-ct-dark-200 rounded-2xl p-8 space-y-5"
          >
            <FormInput label="New Password" name="password" type="password" />
            <FormInput
              label="Confirm Password"
              name="passwordConfirm"
              type="password"
            />
            <LoadingButton
              loading={store.requestLoading}
              textColor="text-ct-blue-600"
            >
              Reset Password
            </LoadingButton>
          </form>
        </FormProvider>
      </div>
    </section>
  );
};

export default ResetPasswordPage;