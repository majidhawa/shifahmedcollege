import Link from 'next/link';
import { Container } from '@/components/Container';
import { site } from '@/data/site';

export default function AdmissionsPage() {
  return (
    <main>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">

        <img
          src="/images/girl2.jpeg"
          alt="Admissions"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />

        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />


        <Container className="relative">

          <div className="mb-5 flex items-center gap-2">

            <span className="h-px w-8 bg-brand-gold" />

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">
              Admissions Open
            </p>

          </div>


          <h1 className="
            max-w-4xl
            text-4xl
            font-extrabold
            leading-tight
            tracking-tight
            md:text-6xl
          ">

            Begin your journey
            towards a rewarding

            <span className="text-brand-gold">
              {" "}healthcare career.
            </span>

          </h1>


          <div className="mt-5 h-1 w-20 rounded-full bg-brand-gold" />


          <p className="
            mt-6
            max-w-2xl
            text-base
            leading-8
            text-white/70
            md:text-lg
          ">

            Join Shifah Medical Training College and receive
            competency-based healthcare training designed to
            equip you with practical skills, professional knowledge,
            and career opportunities.

          </p>



          <div className="mt-8 flex flex-wrap gap-4">

            <Link
              href="/apply"
              className="
                rounded-full
                bg-brand-green
                px-8 py-3
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-brand-green/30
                transition-all
                hover:-translate-y-1
                hover:bg-brand-gold
                hover:text-brand-dark
              "
            >
              Apply Now →
            </Link>


            <Link
              href="/contact"
              className="
                rounded-full
                border
                border-white/30
                px-8 py-3
                text-sm
                font-semibold
                text-white
                transition-all
                hover:bg-white/10
              "
            >
              Contact Admissions
            </Link>

          </div>


          {/* HERO STATS */}

          <div className="
            mt-12
            grid
            max-w-3xl
            grid-cols-2
            gap-4
            md:grid-cols-4
          ">

            {[
              {
                value: "5+",
                label: "Healthcare Departments"
              },
              {
                value: "6+",
                label: "Professional Courses"
              },
              {
                value: "100%",
                label: "Practical Training"
              },
              {
                value: "NITA",
                label: "Accredited"
              }

            ].map((item)=>(
              <div
                key={item.label}
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/5
                  px-5
                  py-4
                  backdrop-blur-sm
                "
              >

                <p className="
                  text-xl
                  font-extrabold
                  text-brand-gold
                ">
                  {item.value}
                </p>


                <p className="
                  mt-1
                  text-xs
                  uppercase
                  tracking-wide
                  text-white/50
                ">
                  {item.label}
                </p>


              </div>
            ))}

          </div>


        </Container>

      </section>




      {/* WHY CHOOSE SHIFAH */}

      <section className="bg-white py-24">

        <Container>


          <div className="mx-auto mb-14 max-w-3xl text-center">


            <div className="
              mb-4
              flex
              items-center
              justify-center
              gap-3
            ">

              <span className="h-px w-10 bg-brand-gold"/>

              <p className="
                text-xs
                font-bold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              ">
                Why Choose Shifah
              </p>

              <span className="h-px w-10 bg-brand-gold"/>

            </div>



            <h2 className="
              text-3xl
              font-extrabold
              text-brand-dark
              md:text-5xl
            ">

              Training that prepares you
              for the

              <span className="text-brand-green">
                {" "}real world.
              </span>

            </h2>


          </div>




          <div className="
            grid
            gap-6
            md:grid-cols-3
          ">


            {[
              {
                title:"Practical Healthcare Training",
                text:"Gain hands-on skills through practical sessions, simulations, and clinical experiences."
              },

              {
                title:"Experienced Trainers",
                text:"Learn from qualified professionals dedicated to mentoring the next generation of healthcare workers."
              },

              {
                title:"Career Focused Programmes",
                text:"Choose programmes designed to meet healthcare industry demands and opportunities."
              }

            ].map((item)=>(


              <div
                key={item.title}
                className="
                  rounded-3xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-8
                  transition-all
                  hover:-translate-y-2
                  hover:bg-white
                  hover:shadow-xl
                "
              >

                <div className="
                  mb-5
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-brand-green/10
                  text-brand-green
                ">

                  ✓

                </div>


                <h3 className="
                  text-lg
                  font-extrabold
                  text-brand-dark
                ">
                  {item.title}
                </h3>


                <p className="
                  mt-3
                  text-sm
                  leading-7
                  text-slate-500
                ">
                  {item.text}
                </p>


              </div>


            ))}


          </div>


        </Container>

      </section>




      {/* ENTRY REQUIREMENTS */}

      <section className="bg-slate-50 py-24">


        <Container>


          <div className="grid gap-12 lg:grid-cols-2">


            <div>


              <div className="mb-5 flex items-center gap-2">

                <span className="h-px w-8 bg-brand-gold"/>

                <p className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.25em]
                  text-brand-gold
                ">
                  Entry Requirements
                </p>

              </div>


              <h2 className="
                text-3xl
                font-extrabold
                text-brand-dark
              ">

                Who can

                <span className="text-brand-green">
                  {" "}apply?
                </span>

              </h2>


              <p className="
                mt-4
                leading-8
                text-slate-500
              ">

                Admission is open to students who meet the
                requirements for their chosen programme.

              </p>


            </div>



            <div>

              <div className="space-y-4">


                {site.requirements.map((item,index)=>(


                  <div
                    key={item}
                    className="
                      flex
                      items-start
                      gap-4
                      rounded-2xl
                      border
                      border-slate-100
                      bg-white
                      p-5
                      shadow-sm
                    "
                  >

                    <span className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-brand-green
                      text-xs
                      font-bold
                      text-white
                    ">
                      {index+1}
                    </span>


                    <p className="
                      text-sm
                      leading-7
                      text-slate-600
                    ">
                      {item}
                    </p>


                  </div>


                ))}


              </div>


            </div>


          </div>


        </Container>


      </section>
            {/* APPLICATION PROCESS */}

      <section className="py-24 bg-white">

        <Container>


          <div className="mx-auto mb-14 max-w-3xl text-center">


            <div className="
              mb-4
              flex
              items-center
              justify-center
              gap-3
            ">

              <span className="h-px w-10 bg-brand-gold"/>

              <p className="
                text-xs
                font-bold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              ">
                Application Process
              </p>

              <span className="h-px w-10 bg-brand-gold"/>

            </div>



            <h2 className="
              text-3xl
              font-extrabold
              text-brand-dark
              md:text-5xl
            ">

              Four simple steps to

              <span className="text-brand-green">
                {" "}join Shifah.
              </span>

            </h2>


            <p className="
              mt-4
              text-slate-500
            ">

              Follow these steps and begin your healthcare training journey.

            </p>


          </div>





          <div className="
            grid
            gap-6
            md:grid-cols-2
            lg:grid-cols-4
          ">


            {[
              {
                number:"01",
                title:"Choose Programme",
                text:"Select the course that matches your career goals and qualifications."
              },

              {
                number:"02",
                title:"Submit Application",
                text:"Complete the online application form or download and submit the application documents."
              },

              {
                number:"03",
                title:"Pay Application Fee",
                text:"Make payment through the approved payment channels and keep your receipt."
              },

              {
                number:"04",
                title:"Receive Confirmation",
                text:"Our admissions team will review your application and provide further guidance."
              }

            ].map((step)=>(


              <div
                key={step.number}
                className="
                  group
                  rounded-3xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-7
                  transition-all
                  hover:-translate-y-2
                  hover:bg-white
                  hover:shadow-xl
                "
              >


                <div className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-brand-green
                  text-sm
                  font-black
                  text-white
                  shadow-lg
                  shadow-brand-green/20
                ">

                  {step.number}

                </div>



                <h3 className="
                  mt-6
                  text-lg
                  font-extrabold
                  text-brand-dark
                ">

                  {step.title}

                </h3>



                <p className="
                  mt-3
                  text-sm
                  leading-7
                  text-slate-500
                ">

                  {step.text}

                </p>


              </div>


            ))}


          </div>


        </Container>

      </section>





      {/* REQUIRED DOCUMENTS */}


      <section className="bg-slate-50 py-24">


        <Container>


          <div className="grid gap-12 lg:grid-cols-2">


            <div>


              <div className="mb-5 flex items-center gap-2">

                <span className="h-px w-8 bg-brand-gold"/>

                <p className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.25em]
                  text-brand-gold
                ">
                  Required Documents
                </p>

              </div>



              <h2 className="
                text-3xl
                font-extrabold
                text-brand-dark
              ">

                Prepare your

                <span className="text-brand-green">
                  {" "}documents.
                </span>

              </h2>



              <p className="
                mt-4
                leading-8
                text-slate-500
              ">

                Applicants should prepare the following documents
                during the admission process.

              </p>



            </div>




            <div className="grid gap-4">


              {[
                "Copy of National Identity Card or Birth Certificate",
                "KCSE Certificate or Result Slip",
                "Passport Size Photographs",
                "Previous Academic Certificates (where applicable)",
                "Completed Application Form"
              ].map((item,index)=>(



                <div
                  key={item}
                  className="
                    flex
                    items-center
                    gap-4
                    rounded-2xl
                    bg-white
                    border
                    border-slate-100
                    p-4
                    shadow-sm
                  "
                >


                  <span className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    bg-brand-green/10
                    text-sm
                    font-bold
                    text-brand-green
                  ">

                    {index+1}

                  </span>


                  <p className="
                    text-sm
                    text-slate-600
                  ">

                    {item}

                  </p>


                </div>


              ))}


            </div>


          </div>


        </Container>


      </section>





      {/* APPLICATION PAYMENT */}


      <section className="py-24 bg-white">


        <Container>


          <div className="
            mx-auto
            mb-12
            max-w-3xl
            text-center
          ">


            <p className="
              text-xs
              font-bold
              uppercase
              tracking-[0.25em]
              text-brand-gold
            ">

              Application Payment

            </p>



            <h2 className="
              mt-3
              text-3xl
              font-extrabold
              text-brand-dark
              md:text-4xl
            ">

              Pay through our

              <span className="text-brand-green">
                {" "}official channels.
              </span>


            </h2>



            <p className="
              mt-4
              text-slate-500
            ">

              Use any of the approved payment methods below
              when making application payments.

            </p>
          </div>

          <div className="
            grid
            gap-8
            md:grid-cols-2
            max-w-4xl
            mx-auto
          ">

            {/* MPESA */}

            <div
              className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                p-8
                shadow-lg
                transition-all
                hover:-translate-y-2
              "
            >


              <div className="flex items-center gap-5">


                <img
                  src="/images/mpesa-logo.png"
                  alt="M-PESA"
                  className="h-14 w-auto object-contain"
                />


                <div>

                  <h3 className="
                    text-xl
                    font-extrabold
                    text-brand-dark
                  ">
                    M-PESA
                  </h3>

                  <p className="text-sm text-slate-500">
                    Mobile Payment
                  </p>

                </div>


              </div>



              <div className="mt-6 space-y-3">


                <p className="text-sm text-slate-600">
                  <span className="font-bold">
                    Paybill:
                  </span>
                  {" "}247247
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-bold">
                    Account:
                  </span>
                  {" "}0330287421280
                </p>
              </div>
            </div>

            {/* EQUITY BANK */}


            <div
              className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                p-8
                shadow-lg
                transition-all
                hover:-translate-y-2
              "
            >
              <div className="flex items-center gap-5">
                <img
                  src="/images/equity-bank-logo.png"
                  alt="Equity Bank"
                  className="h-14 w-auto object-contain"
                />
                <div>
                  <h3 className="
                    text-xl
                    font-extrabold
                    text-brand-dark
                  ">
                    Equity Bank
                  </h3>
                  <p className="text-sm text-slate-500">
                    Bank Payment
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <p className="text-sm text-slate-600">

                  <span className="font-bold">
                    Bank:
                  </span>

                  {" "}Equity Bank

                </p>
                <p className="text-sm text-slate-600">

                  <span className="font-bold">
                    Account:
                  </span>

                  {" "}0330287421280

                </p>
              </div>
            </div>
          </div>

        </Container>

      </section>
            {/* FEES GUIDANCE */}

      <section className="bg-brand-dark py-24 text-white">

        <Container>


          <div className="mx-auto mb-14 max-w-3xl text-center">


            <div className="
              mb-4
              flex
              items-center
              justify-center
              gap-3
            ">

              <span className="h-px w-10 bg-brand-gold" />

              <p className="
                text-xs
                font-bold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              ">
                Fees Guidance
              </p>

              <span className="h-px w-10 bg-brand-gold" />

            </div>



            <h2 className="
              text-3xl
              font-extrabold
              md:text-5xl
            ">

              Transparent and affordable

              <span className="text-brand-gold">
                {" "}training costs.
              </span>

            </h2>



            <p className="
              mt-5
              leading-8
              text-white/70
            ">

              We provide clear fee structures to help students
              and parents plan their education journey with confidence.

            </p>


          </div>




          <div className="
            grid
            gap-6
            md:grid-cols-2
          ">



            {site.feeNotes.map((item,index)=>(


              <div
                key={item}
                className="
                  group
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/5
                  p-7
                  transition-all
                  hover:-translate-y-2
                  hover:bg-white/10
                  hover:border-brand-gold/30
                "
              >


                <div className="
                  mb-5
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-brand-gold/10
                  text-brand-gold
                  transition-all
                  group-hover:bg-brand-gold
                  group-hover:text-brand-dark
                ">

                  {index + 1}

                </div>



                <p className="
                  text-sm
                  leading-7
                  text-white/70
                ">

                  {item}

                </p>


              </div>


            ))}


          </div>




          <div className="
            mt-10
            text-center
          ">


            <p className="
              text-sm
              text-white/50
            ">

              For detailed programme fees, download the official
              fee structures from our downloads section.

            </p>


            <Link
              href="/downloads"
              className="
                mt-5
                inline-flex
                rounded-full
                border
                border-white/20
                px-7
                py-3
                text-sm
                font-semibold
                transition-all
                hover:bg-white/10
              "
            >

              Download Fee Structures →

            </Link>


          </div>


        </Container>


      </section>





      {/* DOWNLOADS SECTION */}


      <section className="bg-slate-50 py-24">


        <Container>


          <div className="
            grid
            gap-10
            lg:grid-cols-2
            lg:items-center
          ">



            <div>


              <p className="
                text-xs
                font-bold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              ">

                Admissions Resources

              </p>



              <h2 className="
                mt-4
                text-3xl
                font-extrabold
                text-brand-dark
                md:text-4xl
              ">

                Get all the

                <span className="text-brand-green">
                  {" "}application materials.
                </span>


              </h2>



              <p className="
                mt-5
                leading-8
                text-slate-500
              ">

                Download application forms, programme details,
                and other important admission documents.

              </p>



            </div>





            <div className="grid gap-4">


              {[
                "Application Form",
                "Course Fee Structures",
                "Admission Requirements",
                "Student Guidelines"
              ].map((item)=>(


                <Link
                  key={item}
                  href="/downloads"
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    bg-white
                    border
                    border-slate-100
                    px-6
                    py-5
                    text-sm
                    font-semibold
                    text-brand-dark
                    shadow-sm
                    transition-all
                    hover:-translate-y-1
                    hover:border-brand-green/30
                    hover:shadow-lg
                  "
                >

                  <span>
                    {item}
                  </span>


                  <span className="
                    text-brand-green
                  ">
                    →
                  </span>


                </Link>


              ))}


            </div>


          </div>


        </Container>


      </section>





      {/* FINAL CTA */}


      <section className="py-20">


        <Container>


          <div
            className="
              relative
              overflow-hidden
              rounded-[2rem]
              bg-brand-green
              px-8
              py-14
              text-white
              md:px-14
            "
          >


            <div
              className="
                absolute
                right-0
                top-0
                h-72
                w-72
                rounded-full
                bg-white/5
                translate-x-1/3
                -translate-y-1/3
              "
            />



            <div className="relative max-w-3xl">


              <p className="
                text-xs
                font-bold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              ">

                Start Your Future Today

              </p>




              <h2 className="
                mt-4
                text-3xl
                font-extrabold
                leading-tight
                md:text-5xl
              ">

                Ready to become a healthcare professional?

              </h2>




              <p className="
                mt-5
                leading-8
                text-white/75
              ">

                Apply today and take the first step towards
                a successful career in healthcare with Shifah
                Medical Training College.

              </p>




              <div className="
                mt-8
                flex
                flex-wrap
                gap-4
              ">



                <Link
                  href="/apply"
                  className="
                    rounded-full
                    bg-white
                    px-8
                    py-3
                    text-sm
                    font-bold
                    text-brand-green
                    transition-all
                    hover:-translate-y-1
                  "
                >

                  Apply Now →

                </Link>




                <Link
                  href="/contact"
                  className="
                    rounded-full
                    border
                    border-white/30
                    px-8
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    hover:bg-white/10
                  "
                >

                  Contact Admissions

                </Link>



              </div>


            </div>


          </div>


        </Container>


      </section>


    </main>
  );
}