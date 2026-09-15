from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai_tools import DirectoryReadTool, FileReadTool, FileWriterTool

from crew.tools.repo_shell_tool import REPO_ROOT, RepoShellTool

_read_tools = [
    FileReadTool(base_dir=REPO_ROOT),
    DirectoryReadTool(directory=REPO_ROOT),
]


@CrewBase
class MermaidStudioCrew():
    """MermaidStudio dev crew: planner -> developer -> reviewer."""

    agents: list[BaseAgent]
    tasks: list[Task]

    @agent
    def planner(self) -> Agent:
        return Agent(
            config=self.agents_config['planner'],  # type: ignore[index]
            tools=_read_tools,
            verbose=True,
        )

    @agent
    def developer(self) -> Agent:
        return Agent(
            config=self.agents_config['developer'],  # type: ignore[index]
            tools=[*_read_tools, FileWriterTool(working_directory=REPO_ROOT)],
            verbose=True,
        )

    @agent
    def reviewer(self) -> Agent:
        return Agent(
            config=self.agents_config['reviewer'],  # type: ignore[index]
            tools=[*_read_tools, RepoShellTool()],
            verbose=True,
        )

    @task
    def plan_task(self) -> Task:
        return Task(
            config=self.tasks_config['plan_task'],  # type: ignore[index]
        )

    @task
    def implement_task(self) -> Task:
        return Task(
            config=self.tasks_config['implement_task'],  # type: ignore[index]
        )

    @task
    def verify_task(self) -> Task:
        return Task(
            config=self.tasks_config['verify_task'],  # type: ignore[index]
            output_file='reports/rapport.md',
        )

    @crew
    def crew(self) -> Crew:
        """Creates the MermaidStudio dev crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )


__all__ = ['MermaidStudioCrew', 'REPO_ROOT']
