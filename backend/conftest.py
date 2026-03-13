"""
Pytest configuration for COWORK.ARMY backend tests.
Adds the COWORK root to sys.path so that 'backend' can be imported as a package.
"""
import sys
import os

# Add COWORK root to path so 'backend' package is importable
cowork_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if cowork_root not in sys.path:
    sys.path.insert(0, cowork_root)
