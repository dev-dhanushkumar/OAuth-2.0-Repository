import { object, string, TypeOf } from "zod";
import { useEffect } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormInput from "../components/FormInput";
import { LoadingButton } from "../components/LoadingButton";
import { toast } from "react-toastify";
import useStore from "../store";

const forgotPasswordSchema = object({
  email: string()
    .min(1, "Email verification code is required")
    .email("Email address is invalid"),
});

export type ForgotPasswordInput = TypeOf<typeof forgotPasswordSchema>;

const ForgotPasswordPage = () => {
  const store = useStore();

  const forgotPasswordUser = async (data: ForgotPasswordInput) => {
    try {
      store.setRequestLoading(true);
      const VITE_SERVER_ENDPOINT = import.meta.env.VITE_SERVER_ENDPOINT;
      const response = await fetch(
        `${VITE_SERVER_ENDPOINT}/api/auth/forgotpassword`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const resData = await response.json();
      if (!response.ok) {
        throw resData;
      }
      toast.success(resData?.message, {
        position: "top-right",
      });
      store.setRequestLoading(false);
      // Optionally navigate or handle success
      return resData;
    } catch (error: any) {
      store.setRequestLoading(false);
      if (error.error && Array.isArray(error.error)) {
        error.error.forEach((err: any) => {
          toast.error(err.message, {
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

  const methods = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
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
  }, [isSubmitSuccessful]);

  const onSubmitHandler: SubmitHandler<ForgotPasswordInput> = (values) => {
    forgotPasswordUser(values);
  };

  return (
    <section className="bg-ct-blue-600 min-h-screen grid place-items-center">
      <div className="w-full">
        <h1 className="text-4xl lg:text-6xl text-center font-[600] text-ct-yellow-600 mb-14">
          Forgot Password
        </h1>
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmitHandler)}
            className="max-w-md w-full mx-auto overflow-hidden shadow-lg bg-ct-dark-200 rounded-2xl p-8 space-y-5"
          >
            <FormInput label="Email Address" name="email" type="email" />
            <LoadingButton
              loading={store.requestLoading}
              textColor="text-ct-blue-600"
            >
              Send Password Reset Link
            </LoadingButton>
          </form>
        </FormProvider>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;