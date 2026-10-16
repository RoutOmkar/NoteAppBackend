
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const { data, error } = await resend.emails.send({
    from: "Notes App <onboarding@resend.dev>",
    to: [email],
    subject: "Email Verification OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Could not send OTP email");
  }

  return data;
};

export default sendOTPEmail;
