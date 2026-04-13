import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | Dr. BeautyBot",
  description: "Política de privacidad de la aplicación Dr. BeautyBot",
};

export default function PrivacidadPage() {
  const lastUpdated = "12 de abril de 2026";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f3e8ff] to-white dark:from-[#1a1025] dark:to-[#0d0d0d] px-6 py-12">
      <article className="max-w-2xl mx-auto space-y-8 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#7c3aed] dark:text-[#c4b5fd]">
            Política de Privacidad
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última actualización: {lastUpdated}
          </p>
        </header>

        {/* Intro */}
        <section className="space-y-3">
          <p>
            <strong className="text-gray-900 dark:text-white">Dr. BeautyBot</strong> es
            una aplicación de asistencia informativa en medicina estética desarrollada por{" "}
            <strong className="text-gray-900 dark:text-white">Djiin DevHouse</strong>. Tu
            privacidad es importante para nosotros. Esta política explica qué datos
            recopilamos, cómo los usamos y cómo los protegemos.
          </p>
        </section>

        {/* Sections */}
        <Section title="1. Información que recopilamos">
          <p>La app puede recopilar los siguientes datos según las funciones que utilices:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Datos de perfil:</strong> nombre, tipo de piel, procedimientos de
              interés y fechas de procedimientos que tú ingresas voluntariamente.
            </li>
            <li>
              <strong>Conversaciones con el chatbot:</strong> las preguntas que envías al
              asistente para generar respuestas personalizadas.
            </li>
            <li>
              <strong>Fotografías (cámara):</strong> si usas la función de Diario, puedes
              tomar o seleccionar fotos de seguimiento. Estas imágenes se almacenan
              únicamente en tu dispositivo y/o en tu cuenta personal de Firebase.{" "}
              <strong>No se comparten con terceros.</strong>
            </li>
            <li>
              <strong>Datos de uso:</strong> información anónima sobre cómo interactúas con
              la app para mejorar la experiencia.
            </li>
          </ul>
        </Section>

        <Section title="2. Uso de la cámara">
          <p>
            La app solicita permiso de acceso a la cámara de tu dispositivo exclusivamente
            para la función de <strong>Diario de Procedimientos</strong>, que te permite
            fotografiar y documentar tu seguimiento personal. Las fotos:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Se redimensionan localmente en tu dispositivo antes de almacenarse.</li>
            <li>Se guardan en tu cuenta personal (Firebase) o en el almacenamiento local del dispositivo.</li>
            <li>No se envían a servidores de terceros ni se utilizan con fines publicitarios.</li>
            <li>Puedes eliminarlas en cualquier momento desde la app.</li>
          </ul>
        </Section>

        <Section title="3. Servicios de terceros">
          <p>Dr. BeautyBot utiliza los siguientes servicios de terceros:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Firebase (Google):</strong> para autenticación de usuarios y
              almacenamiento de datos. Consulta la{" "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7c3aed] dark:text-[#c4b5fd] underline"
              >
                política de privacidad de Firebase
              </a>
              .
            </li>
            <li>
              <strong>OpenAI:</strong> para procesar las consultas del chatbot y generar
              respuestas. Las preguntas se envían de forma anónima (sin datos personales
              identificables). Consulta la{" "}
              <a
                href="https://openai.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7c3aed] dark:text-[#c4b5fd] underline"
              >
                política de privacidad de OpenAI
              </a>
              .
            </li>
            <li>
              <strong>Vercel:</strong> para el alojamiento de la aplicación web.
            </li>
          </ul>
        </Section>

        <Section title="4. Almacenamiento local">
          <p>
            Parte de tu información (perfil, historial de conversaciones, entradas del
            diario) puede almacenarse localmente en tu dispositivo mediante{" "}
            <em>localStorage</em> del navegador. Estos datos permanecen en tu dispositivo y
            no se transmiten externamente, salvo cuando se sincronizan con tu cuenta de
            Firebase.
          </p>
        </Section>

        <Section title="5. Seguridad">
          <p>
            Implementamos medidas de seguridad estándar de la industria para proteger tus
            datos, incluyendo conexiones cifradas (HTTPS), reglas de seguridad en Firebase y
            almacenamiento seguro de credenciales. Sin embargo, ningún sistema es 100%
            seguro, por lo que te recomendamos no compartir información médica sensible que
            no desees almacenar.
          </p>
        </Section>

        <Section title="6. Datos de menores">
          <p>
            Dr. BeautyBot no está dirigida a menores de 18 años. No recopilamos
            intencionalmente datos de menores de edad. Si descubrimos que hemos recopilado
            información de un menor, la eliminaremos de inmediato.
          </p>
        </Section>

        <Section title="7. Tus derechos">
          <p>Tienes derecho a:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Acceder a los datos que tenemos sobre ti.</li>
            <li>Solicitar la corrección o eliminación de tus datos.</li>
            <li>Revocar los permisos de cámara en cualquier momento desde la configuración de tu dispositivo.</li>
            <li>Eliminar tu cuenta y todos los datos asociados.</li>
          </ul>
        </Section>

        <Section title="8. Cambios a esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios
            significativos a través de la app. La fecha de última actualización se indica al
            inicio de este documento.
          </p>
        </Section>

        <Section title="9. Contacto">
          <p>
            Si tienes preguntas sobre esta política de privacidad, puedes contactarnos en:
          </p>
          <ul className="list-none mt-2 space-y-1">
            <li>
              📧{" "}
              <a
                href="mailto:contacto@drbeautybot.app"
                className="text-[#7c3aed] dark:text-[#c4b5fd] underline"
              >
                contacto@drbeautybot.app
              </a>
            </li>
            <li>
              📱{" "}
              <a
                href="https://instagram.com/drbeautybot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7c3aed] dark:text-[#c4b5fd] underline"
              >
                @drbeautybot
              </a>
            </li>
          </ul>
        </Section>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} Djiin DevHouse. Todos los derechos reservados.
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}