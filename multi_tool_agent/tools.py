import os
import subprocess

def read_file(filepath: str) -> dict:
    """
    Reads the content of a file.

    Args:
        filepath (str): The absolute or relative path to the file.

    Returns:
        dict: A dictionary containing 'status' and either 'content' or 'error_message'.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"status": "success", "content": content}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}

def write_file(filepath: str, content: str) -> dict:
    """
    Writes content to a file. Creates directories if they don't exist.

    Args:
        filepath (str): The absolute or relative path to the file.
        content (str): The content to write to the file.

    Returns:
        dict: A dictionary containing 'status' and 'message' or 'error_message'.
    """
    try:
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return {"status": "success", "message": f"Successfully wrote to {filepath}"}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}

def run_command(command: str, cwd: str = ".") -> dict:
    """
    Runs a shell command and returns the output.

    Args:
        command (str): The command to execute in the shell.
        cwd (str): The directory to run the command in. Defaults to current directory.

    Returns:
        dict: A dictionary containing 'status', 'stdout', and 'stderr'.
    """
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except Exception as e:
        return {"status": "error", "error_message": str(e)}

def list_directory(dir_path: str = ".") -> dict:
    """
    Lists the contents of a directory.

    Args:
        dir_path (str): The path to the directory.

    Returns:
        dict: A dictionary containing status and the list of files/folders.
    """
    try:
        items = os.listdir(dir_path)
        return {"status": "success", "items": items}
    except Exception as e:
        return {"status": "error", "error_message": str(e)}

