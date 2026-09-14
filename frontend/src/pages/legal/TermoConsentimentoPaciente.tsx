import PaginaLegal from './PaginaLegal'

export default function TermoConsentimentoPaciente() {
  return (
    <PaginaLegal titulo="Termo de Consentimento para Tratamento de Dados de Saúde" atualizadoEm="13/09/2026">
      <p>
        Este termo é apresentado ao paciente (ou responsável legal, se menor/incapaz) no momento do cadastro na
        clínica, antes ou durante o primeiro atendimento, e assinado em papel ou por meio de aceite registrado no
        sistema pela equipe da recepção.
      </p>

      <h2>1. Dados tratados</h2>
      <p>
        Prontuário e evolução clínica, resultados e histórico de atendimentos, fotografias clínicas (quando
        aplicável, ex: pré/pós-operatório), receitas e prescrições, e dados cadastrais (nome, CPF, data de
        nascimento, endereço, filiação).
      </p>

      <h2>2. Finalidade</h2>
      <p>
        Esses dados são usados exclusivamente para viabilizar o atendimento e cuidado de saúde do paciente na
        clínica, elaborar e manter seu prontuário, emitir documentos relacionados ao tratamento (receitas,
        relatórios, atestados) e cumprir obrigações legais da área de saúde.
      </p>

      <h2>3. Base legal</h2>
      <p>
        Tutela da saúde, em procedimento realizado por profissionais de saúde (art. 11, II, "f" da LGPD), combinada
        com o consentimento específico do paciente para as finalidades aqui descritas.
      </p>

      <h2>4. Acesso aos dados</h2>
      <p>
        Têm acesso a esses dados os profissionais da clínica diretamente envolvidos no atendimento. O sistema
        utilizado pela clínica é fornecido pela TECBM, que atua apenas como operadora técnica, com acesso limitado ao
        necessário para manutenção do sistema e sob obrigação contratual de sigilo.
      </p>

      <h2>5. Direitos do paciente</h2>
      <p>
        O paciente pode, a qualquer momento, solicitar à clínica acesso aos seus dados, correção de informações
        incorretas, e esclarecimentos sobre o tratamento realizado. Pode revogar este consentimento a qualquer
        momento, sem prejuízo do tratamento já realizado nem da guarda de prontuário exigida por regulamentação
        profissional, que a clínica mantém independentemente da revogação.
      </p>

      <h2>6. Retenção</h2>
      <p>O prontuário é mantido pelo prazo mínimo exigido pela regulamentação do Conselho Federal de Medicina e legislação aplicável.</p>

      <p className="pt-4 text-slate-500">
        Este texto acompanha o registro de consentimento feito no cadastro do paciente dentro do sistema. Em caso de
        dúvida, procure a clínica onde você foi atendido.
      </p>
    </PaginaLegal>
  )
}
