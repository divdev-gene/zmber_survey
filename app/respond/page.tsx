'use client';

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #F5F4F0;
  color: #1a1a1a;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.container {
  max-width: 720px;
  margin: 0 auto;
}

.completion-box {
  background: #EAF3DE;
  border: 1px solid #C0DD97;
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  margin-top: 4rem;
}

.check-icon {
  width: 60px;
  height: 60px;
  background: #639922;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}

.completion-box h2 {
  font-size: 22px;
  font-weight: 600;
  color: #27500A;
  margin-bottom: 10px;
}

.completion-box p {
  font-size: 14.5px;
  color: #3B6D11;
  line-height: 1.6;
  max-width: 440px;
  margin: 0 auto;
}

.footer {
  text-align: center;
  font-size: 12px;
  color: #bbb;
  margin-top: 2rem;
}

@media (max-width: 600px) {
  body {
    padding: 1rem 0.75rem;
  }

  .completion-box {
    padding: 2rem 1.25rem;
  }
}
`;

const HTML = `
<div class="container">

    <div class="completion-box">
  <div class="check-icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>

  <h2>Thank You!</h2>

  <p>
    The Supplier Satisfaction Survey has now been closed and is no longer accepting responses.
  </p>

  <p style="margin-top:12px;">
    We sincerely appreciate the time and feedback provided by all participating suppliers.
  </p>

  <p style="margin-top:12px; font-size:13px; color:#639922;">
    Thank you for your partnership. 🙏
  </p>
</div>



  <div class="footer">
    Amber Supplier Satisfaction Survey | Confidential | Conducted by Independent Third-Party Agency
  </div>

</div>
`;

export default function RespondPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  );
}