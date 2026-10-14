const OTPMailTem = (otp, subject, company) => {
  return `
    <div style="
      margin:0;
      padding:0;
      background-color:#f4f7fb;
      font-family:Arial, Helvetica, sans-serif;
      width:100%;
    ">

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          background-color:#f4f7fb;
          padding:40px 0;
        "
      >
        <tr>
          <td align="center">

            <table
              width="600"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                background-color:#ffffff;
                border-radius:12px;
                overflow:hidden;
              "
            >

              <!-- Header -->
              <tr>
                <td
                  align="center"
                  style="
                    background-color:#2563eb;
                    padding:30px;
                    color:#ffffff;
                  "
                >
                  <h1 style="
                    margin:0;
                    font-size:28px;
                  ">
                   ${subject}
                  </h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="
                  padding:40px 30px;
                  color:#333333;
                ">

                  <h2 style="margin-top:0;">
                    Hello User,
                  </h2>

                  <p style="
                    font-size:16px;
                    line-height:1.7;
                  ">
                    Use the following OTP code to verify your email address.
                  </p>

                  <!-- OTP Box -->
                  <div style="
                    text-align:center;
                    margin:35px 0;
                  ">

                    <span style="
                      display:inline-block;
                      background-color:#eff6ff;
                      color:#2563eb;
                      padding:16px 40px;
                      font-size:34px;
                      font-weight:bold;
                      letter-spacing:8px;
                      border-radius:10px;
                      border:2px dashed #2563eb;
                    ">
                      ${otp}
                    </span>

                  </div>

                  <p style="
                    font-size:15px;
                    line-height:1.6;
                  ">
                    This OTP is valid for <strong>5 minutes</strong>.
                  </p>

                  <p style="
                    font-size:15px;
                    line-height:1.6;
                  ">
                    If you did not request this OTP, please ignore this email.
                  </p>

                  <p style="margin-top:30px;">
                    Regards,<br>
                    <strong>${company}</strong>
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td
                  align="center"
                  style="
                    background-color:#f9fafb;
                    padding:20px;
                    font-size:13px;
                    color:#777777;
                  "
                >
                  © 2026 Your Company. All rights reserved.
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </div>
  `;
};

module.exports = { OTPMailTem };
