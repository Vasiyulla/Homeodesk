# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from google.adk.agents import Agent
from .tools import read_file, write_file, run_command, list_directory

# ---------------------------------------------------------
# Sub-Agents
# ---------------------------------------------------------

software_engineer_agent = Agent(
    name="software_engineer_agent",
    model="gemini-1.5-pro-latest",
    description="Agent responsible for writing and editing code for the homeopathy software.",
    instruction=(
        "You are an expert Software Engineer working on the Homeopathy software system. "
        "Your task is to improve the existing codebase and add new features. "
        "CRITICAL RULE: DO NOT delete existing features or overwrite files completely without understanding them. "
        "Always read the existing files first. Integrate your new code carefully into the existing logic. "
        "Ensure all prior functionalities remain perfectly intact while you add or enhance features. "
        "Always ensure your code is well-documented and follows best practices."
    ),
    tools=[read_file, write_file, run_command, list_directory],
)

project_manager_agent = Agent(
    name="project_manager_agent",
    model="gemini-1.5-pro-latest",
    description="Agent responsible for breaking down requirements into tasks and planning architecture.",
    instruction=(
        "You are the Project Manager for the Homeopathy software system. "
        "Your task is to take high-level feature requests and break them down into actionable steps or tasks. "
        "You must analyze the existing project structure before making plans to ensure new features fit seamlessly. "
        "You can read requirements and write markdown plans or TODO lists to files."
    ),
    tools=[read_file, write_file, list_directory],
)

qa_agent = Agent(
    name="qa_agent",
    model="gemini-1.5-pro-latest",
    description="Agent responsible for testing and verifying the software.",
    instruction=(
        "You are a Quality Assurance Engineer for the Homeopathy software system. "
        "Your task is to review code, write test cases, and verify that features work as intended. "
        "You can read files and run shell commands to execute tests or builds."
    ),
    tools=[read_file, run_command, list_directory],
)

# ---------------------------------------------------------
# Root Orchestrator Agent
# ---------------------------------------------------------

root_agent = Agent(
    name="orchestrator_agent",
    model="gemini-1.5-pro-latest",
    description=(
        "The Orchestrator Agent that manages the development of the Homeopathy software. "
        "It delegates tasks to the Project Manager, Software Engineer, and QA agents."
    ),
    instruction=(
        "You are the Lead Orchestrator for the Homeopathy software system. "
        "Your job is to manage the end-to-end development process, focusing on INCREMENTAL IMPROVEMENTS. "
        "CRITICAL RULE: The user already has an existing project. Your goal is to improve the code and add features, NOT rewrite or delete existing features. "
        "When the user asks you to build a feature: "
        "1. Consult the project_manager_agent to analyze the existing project and plan the architecture safely. "
        "2. Delegate the coding tasks to the software_engineer_agent with strict instructions to preserve existing logic. "
        "3. Have the qa_agent verify the changes don't break existing functionality. "
        "Coordinate these agents effectively to fulfill the user's request while protecting the current codebase."
    ),
    sub_agents=[project_manager_agent, software_engineer_agent, qa_agent],
    tools=[list_directory],
)
