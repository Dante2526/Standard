// githubActionsService.ts
// Responsável por acionar os fluxos de trabalho (workflows) do GitHub Actions

const GITHUB_REPO_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'Dante2526'; 
const GITHUB_REPO_NAME = import.meta.env.VITE_GITHUB_REPO || 'Trainify';
const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT; // Personal Access Token

/**
 * Aciona o workflow de notificação de marco do GitHub Actions
 */
export const triggerMilestoneEmail = async (
  name: string,
  matricula: string,
  milestoneHours: number
): Promise<boolean> => {
  if (!GITHUB_PAT) {
    console.warn('VITE_GITHUB_PAT não configurado. Não é possível disparar o e-mail via GitHub Actions.');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GITHUB_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'milestone_reached',
          client_payload: {
            name,
            matricula,
            milestoneHours,
          },
        }),
      }
    );

    if (response.ok) {
      console.log(`Disparo do workflow de e-mail efetuado com sucesso para o marco de ${milestoneHours}h.`);
      return true;
    } else {
      console.error('Falha ao disparar workflow do GitHub Actions', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Erro de rede ao disparar workflow do GitHub Actions:', error);
    return false;
  }
};
