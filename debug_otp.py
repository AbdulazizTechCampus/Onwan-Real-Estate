#!/usr/bin/env python3
"""
Debug OTP Authentication Flow
"""

import requests
import time
import re
import subprocess
import json

API_URL = "https://realty-revamp-2.preview.emergentagent.com/api"
TEST_PHONE = "0501234567"

def get_latest_otp():
    """Extract the latest OTP from backend logs"""
    try:
        result = subprocess.run(['tail', '-n', '20', '/var/log/supervisor/backend.err.log'], 
                              capture_output=True, text=True)
        log_content = result.stdout
        
        # Look for the most recent OTP
        otp_matches = re.findall(r'رمز التحقق الخاص بك في منصة عنوان هو: (\d{6})', log_content)
        if otp_matches:
            return otp_matches[-1]  # Return the latest OTP
        return None
    except Exception as e:
        print(f"Error extracting OTP: {e}")
        return None

def test_otp_flow():
    """Test the complete OTP flow with debugging"""
    print("🔍 Testing OTP Authentication Flow")
    print("=" * 50)
    
    # Step 1: Send OTP
    print("📤 Step 1: Sending OTP...")
    otp_data = {
        "phone_number": TEST_PHONE,
        "user_type": "broker_individual",
        "language": "ar"
    }
    
    response = requests.post(f"{API_URL}/auth/send-otp", json=otp_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    if response.status_code != 200:
        print("❌ Failed to send OTP")
        return False
    
    # Step 2: Extract OTP from logs
    print("\n🔍 Step 2: Extracting OTP from logs...")
    time.sleep(1)  # Give time for log to be written
    
    otp_code = get_latest_otp()
    if not otp_code:
        print("❌ Could not extract OTP from logs")
        return False
    
    print(f"   ✅ Extracted OTP: {otp_code}")
    
    # Step 3: Verify OTP immediately
    print(f"\n✅ Step 3: Verifying OTP {otp_code}...")
    verify_data = {
        "phone_number": TEST_PHONE,
        "otp_code": otp_code,
        "user_type": "broker_individual"
    }
    
    response = requests.post(f"{API_URL}/auth/verify-otp", json=verify_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    if response.status_code == 200 and response.json().get('success'):
        print("✅ OTP verification successful!")
        return True
    else:
        print("❌ OTP verification failed")
        return False

def test_with_any_code():
    """Test if any 6-digit code works as mentioned in requirements"""
    print("\n🔍 Testing if any 6-digit code works...")
    
    test_codes = ["123456", "000000", "999999", "111111"]
    
    for code in test_codes:
        print(f"\n   Testing code: {code}")
        verify_data = {
            "phone_number": TEST_PHONE,
            "otp_code": code,
            "user_type": "visitor"
        }
        
        response = requests.post(f"{API_URL}/auth/verify-otp", json=verify_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Code {code} worked!")
            return True
        else:
            try:
                error_detail = response.json().get('detail', 'Unknown error')
                print(f"   ❌ Code {code} failed: {error_detail}")
            except:
                print(f"   ❌ Code {code} failed with status {response.status_code}")
    
    return False

if __name__ == "__main__":
    print("Onwan Real Estate - OTP Debug Test")
    print(f"API URL: {API_URL}")
    print(f"Test Phone: {TEST_PHONE}")
    print()
    
    # Test the normal OTP flow
    success1 = test_otp_flow()
    
    # Test if any code works
    success2 = test_with_any_code()
    
    print("\n" + "=" * 50)
    print("📊 Debug Results:")
    print(f"   Normal OTP Flow: {'✅ PASSED' if success1 else '❌ FAILED'}")
    print(f"   Any Code Test: {'✅ PASSED' if success2 else '❌ FAILED'}")
    
    if not success1 and not success2:
        print("\n⚠️ OTP system appears to have issues. This needs to be fixed before frontend testing.")
    else:
        print("\n✅ OTP system is working correctly.")