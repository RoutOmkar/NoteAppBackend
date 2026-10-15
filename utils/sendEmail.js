import nodemailer from "nodemailer";


const sendOTPEmail = async (email, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER or EMAIL_PASS is missing");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "Email Verification OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes. Do not share it with anyone.`
  });
};

export default sendOTPEmail;



// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// const sendOTPEmail = async (email, otp) => {
//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "Verify Your Email - OTP",
//     text: `Your OTP is ${otp}. It expires in 5 minutes. Do not share it with anyone.`
//   });
// };

// export default sendOTPEmail;