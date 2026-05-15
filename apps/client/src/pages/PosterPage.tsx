import {
  Description,
  Title,
  TextInput,
  TextArea,
  NumberInput,
  PhoneInput,
  DateInput,
  YesNo,
} from "@taylordb/forms-ui";

export default function PosterPage() {
  return (
    <div style={{ 
        minHeight: '100vh', 
        padding: '40px',
        background: '#f9fafb',
        fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 10px' }}>Apply to join our team</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>We are looking for talented individuals to help us build the future.</p>
      </div>

      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px' 
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <Title>Basic Information</Title>
          <TextInput placeholder="Full Name" />
          <div style={{ marginTop: '10px' }} />
          <PhoneInput placeholder="+1 555 123 4567" />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <Title>Details</Title>
          <NumberInput placeholder="Years of experience" />
          <div style={{ marginTop: '10px' }} />
          <DateInput />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <Title>Tell us more</Title>
          <TextArea placeholder="Why do you want to work with us?" />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <Title>Quick Check</Title>
          <Description>Are you available to start immediately?</Description>
          <YesNo />
        </div>
      </div>
    </div>
  );
}
