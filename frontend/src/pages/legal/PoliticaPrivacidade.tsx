import PaginaLegal from './PaginaLegal'

export default function PoliticaPrivacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade — CLÍNICAS (TECBM)" atualizadoEm="13/09/2026">
      <p>
        Esta Política de Privacidade descreve como a <strong>TECBM</strong> (BRUNO MARTINS DA SILVA 39943134810, CNPJ
        38.030.645/0001-40), desenvolvedora do sistema <strong>CLÍNICAS</strong> ("Sistema"), trata os dados pessoais
        envolvidos no uso do Sistema, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº
        13.709/2018 — LGPD).
      </p>

      <h2>1. Quem trata os seus dados</h2>
      <p>
        O Sistema é licenciado a clínicas médicas ("Clínica Contratante") para gestão do seu dia a dia. Em relação
        aos <strong>dados dos pacientes</strong>, a <strong>Clínica Contratante é a Controladora</strong> — é ela quem
        decide atender o paciente, define finalidades e responde pelos dados perante o paciente e a ANPD. A{' '}
        <strong>TECBM atua como Operadora</strong>, tratando esses dados apenas para viabilizar o funcionamento
        técnico do Sistema, conforme instruções da Clínica Contratante.
      </p>
      <p>
        Já em relação aos <strong>dados dos usuários do Sistema</strong> (funcionários da clínica: médicos,
        enfermagem, recepção, financeiro, administradores), a TECBM trata login/senha/perfil de acesso como parte da
        prestação do serviço à Clínica Contratante, que também é responsável por esses colaboradores perante a LGPD.
      </p>
      <p>Se você é paciente de uma clínica que usa o Sistema, para dúvidas sobre seus dados, procure diretamente a clínica onde foi atendido.</p>

      <h2>2. Dados que o Sistema trata</h2>
      <p><strong>Dados de pacientes</strong> (inseridos pela Clínica Contratante):</p>
      <ul>
        <li>Identificação: nome completo, CPF, data de nascimento, sexo, filiação (nome da mãe/responsável), endereço, telefone.</li>
        <li>Dados de saúde (categoria sensível — art. 5º, II da LGPD): prontuário e evolução clínica, receitas e prescrições, fotos pré/pós-operatório, dados de cirurgias, histórico de agendamentos/atendimentos.</li>
        <li>Dados financeiros do paciente: orçamentos, pagamentos, contratos assinados.</li>
      </ul>
      <p><strong>Dados de usuários (equipe da clínica)</strong>:</p>
      <ul>
        <li>Identificação: nome, e-mail, telefone, perfil/função.</li>
        <li>Ponto eletrônico: foto e geolocalização no momento da marcação.</li>
        <li>Dados financeiros pessoais (módulo "Finanças pessoais", visível só ao próprio usuário).</li>
      </ul>

      <h2>3. Para que usamos esses dados</h2>
      <ul>
        <li>Viabilizar o atendimento clínico, agendamento, prontuário eletrônico e emissão de documentos.</li>
        <li>Controle de ponto eletrônico e jornada de trabalho dos colaboradores da clínica.</li>
        <li>Gestão financeira da clínica.</li>
        <li>Segurança e auditoria de acesso ao Sistema.</li>
        <li>Cumprimento de obrigações legais e regulatórias da área de saúde.</li>
      </ul>

      <h2>4. Base legal do tratamento</h2>
      <ul>
        <li><strong>Dados de saúde do paciente</strong>: tutela da saúde (art. 11, II, "f" da LGPD), combinada com consentimento específico do paciente.</li>
        <li><strong>Dados dos colaboradores</strong>: execução de contrato de trabalho/prestação de serviço e cumprimento de obrigação legal.</li>
        <li><strong>Dados financeiros e administrativos</strong>: execução de contrato e legítimo interesse na gestão do negócio.</li>
      </ul>

      <h2>5. Com quem compartilhamos dados</h2>
      <ul>
        <li>Provedores de infraestrutura que hospedam o Sistema (Supabase, Render, Netlify), sob obrigação contratual de segurança e confidencialidade.</li>
        <li>Não compartilhamos dados com terceiros para fins de publicidade, nem vendemos dados pessoais.</li>
        <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
      </ul>

      <h2>6. Por quanto tempo guardamos os dados</h2>
      <p>
        Prontuários e registros clínicos são mantidos pelo prazo mínimo exigido pela regulamentação do Conselho
        Federal de Medicina e legislação de saúde aplicável. Dados financeiros seguem prazos de guarda fiscal/contábil.
        Demais dados são mantidos enquanto durar o contrato entre a TECBM e a Clínica Contratante.
      </p>

      <h2>7. Seus direitos como titular dos dados</h2>
      <p>
        Nos termos do art. 18 da LGPD, você pode solicitar: confirmação de tratamento, acesso, correção,
        anonimização/bloqueio/eliminação, portabilidade, eliminação de dados tratados com consentimento, informação
        sobre compartilhamento, e revogação do consentimento.
      </p>
      <ul>
        <li>Pacientes: solicitem diretamente à clínica onde foram atendidos.</li>
        <li>Colaboradores/usuários do Sistema: solicitem à administração da clínica, ou à TECBM pelo e-mail abaixo.</li>
      </ul>

      <h2>8. Segurança dos dados</h2>
      <p>
        O Sistema adota controle de acesso por perfil de usuário, senhas criptografadas, conexão HTTPS/TLS e
        políticas de segurança em nível de linha (RLS) no banco de dados. Em caso de incidente que gere risco
        relevante aos titulares, a TECBM comunicará a Clínica Contratante para as providências cabíveis.
      </p>

      <h2>9. Encarregado de Proteção de Dados (DPO)</h2>
      <p>Bruno Martins da Silva — tecbmtecnologia@gmail.com</p>

      <h2>10. Alterações desta política</h2>
      <p>Esta política pode ser atualizada periodicamente, com a versão vigente sempre disponível dentro do Sistema.</p>

      <h2>11. Foro</h2>
      <p>Fica eleito o foro da comarca de São Paulo/SP.</p>
    </PaginaLegal>
  )
}
