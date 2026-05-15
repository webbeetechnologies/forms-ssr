import {
  Description,
  Form,
  Title,
  lightTheme,
  type FormTheme,
} from "@taylordb/forms-ui";

const posterTheme: FormTheme = {
  ...lightTheme,
  accent: "#8b5cf6",
};

export default function PosterPage() {
  return (
    <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'white',
        fontFamily: 'sans-serif'
    }}>
      <Form theme={posterTheme}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Title>We are hiring!</Title>
          <Description>
            Join our team and build the future of forms.
            <br />
            Scan to apply.
          </Description>
        </div>
      </Form>
    </div>
  );
}
