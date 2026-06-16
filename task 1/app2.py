"""
Launcher — runs the Speech-to-Text Flask app from the root folder.
Usage: python app.py
"""
import subprocess
import sys
import os

app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "task 1", "speech-to-text-web")
python  = os.path.join(app_dir, "venv", "Scripts", "python.exe")

subprocess.run([python, "app.py"], cwd=app_dir)
