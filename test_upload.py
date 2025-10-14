#!/usr/bin/env python3
"""
Simple test script to verify upload and quiz functionality
"""
import requests
import json
import os

# Test configuration
BASE_URL = "http://localhost:5001"
TEST_USER_ID = "demo_user_123"

def test_health():
    """Test if the backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_list_files():
    """Test listing files"""
    try:
        response = requests.get(f"{BASE_URL}/files?user_id={TEST_USER_ID}")
        print(f"List files: {response.status_code}")
        if response.status_code == 200:
            files = response.json()
            print(f"Files found: {len(files)}")
            for file in files:
                print(f"  - {file.get('filename', 'Unknown')} (ID: {file.get('file_id', 'Unknown')})")
        return response.status_code == 200
    except Exception as e:
        print(f"List files failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing SmartDocs Backend...")
    print("=" * 40)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    if not test_health():
        print("❌ Backend is not running!")
        exit(1)
    print("✅ Backend is running")
    
    # Test 2: List files
    print("\n2. Testing list files...")
    if test_list_files():
        print("✅ List files working")
    else:
        print("❌ List files failed")
    
    print("\n" + "=" * 40)
    print("Test completed!")