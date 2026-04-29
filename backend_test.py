#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Onwan Real Estate Platform
Tests all authentication endpoints and core functionality
"""

import requests
import sys
import json
from datetime import datetime
import time

class OnwanAPITester:
    def __init__(self, base_url="https://onwan-subscriptions.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_phone = "0501234567"
        self.test_otp = "123456"
        self.test_national_id = "1234567890"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, headers=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
            
            return success, response.status_code, response_data
            
        except requests.exceptions.RequestException as e:
            return False, 0, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoint"""
        success, status, data = self.make_request('GET', 'health')
        return self.log_test(
            "Health Check", 
            success and data.get('status') == 'healthy',
            f"Status: {status}, Response: {data}"
        )

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, status, data = self.make_request('GET', '')
        return self.log_test(
            "Root Endpoint", 
            success and 'message' in data,
            f"Status: {status}, Message: {data.get('message', '')}"
        )

    def test_user_types(self):
        """Test user types endpoint"""
        success, status, data = self.make_request('GET', 'user-types')
        user_types_valid = success and 'user_types' in data and len(data['user_types']) > 0
        return self.log_test(
            "User Types", 
            user_types_valid,
            f"Status: {status}, Types count: {len(data.get('user_types', []))}"
        )

    def test_send_otp(self):
        """Test OTP sending"""
        otp_data = {
            "phone_number": self.test_phone,
            "user_type": "broker_individual",
            "language": "ar"
        }
        
        success, status, data = self.make_request('POST', 'auth/send-otp', otp_data)
        otp_sent = success and data.get('success') == True
        
        # Extract OTP from logs for testing (development hack)
        if otp_sent:
            try:
                import subprocess
                result = subprocess.run(['tail', '-n', '10', '/var/log/supervisor/backend.err.log'], 
                                      capture_output=True, text=True)
                log_content = result.stdout
                
                # Look for OTP in the log
                import re
                otp_match = re.search(r'رمز التحقق الخاص بك في منصة عنوان هو: (\d{6})', log_content)
                if otp_match:
                    self.test_otp = otp_match.group(1)
                    print(f"   🔍 Extracted OTP from logs: {self.test_otp}")
            except Exception as e:
                print(f"   ⚠️ Could not extract OTP from logs: {e}")
        
        return self.log_test(
            "Send OTP", 
            otp_sent,
            f"Status: {status}, Success: {data.get('success')}, Message: {data.get('message', '')}"
        )

    def test_verify_otp(self):
        """Test OTP verification"""
        verify_data = {
            "phone_number": self.test_phone,
            "otp_code": self.test_otp,
            "user_type": "broker_individual"
        }
        
        success, status, data = self.make_request('POST', 'auth/verify-otp', verify_data)
        
        if success and data.get('success'):
            self.token = data.get('access_token')
            
        otp_verified = success and data.get('success') == True and 'access_token' in data
        
        # Print detailed error information
        if not otp_verified:
            print(f"   🔍 OTP Verification Details:")
            print(f"      Status Code: {status}")
            print(f"      Response Data: {json.dumps(data, ensure_ascii=False, indent=6)}")
            
        return self.log_test(
            "Verify OTP", 
            otp_verified,
            f"Status: {status}, Success: {data.get('success')}, Token received: {'Yes' if self.token else 'No'}"
        )

    def test_get_profile(self):
        """Test getting user profile (requires authentication)"""
        if not self.token:
            return self.log_test("Get Profile", False, "No authentication token available")
        
        success, status, data = self.make_request('GET', 'auth/profile')
        profile_valid = success and 'user' in data
        return self.log_test(
            "Get Profile", 
            profile_valid,
            f"Status: {status}, User ID: {data.get('user', {}).get('id', 'N/A')}"
        )

    def test_nafath_verification(self):
        """Test Nafath verification (requires authentication)"""
        if not self.token:
            return self.log_test("Nafath Verification", False, "No authentication token available")
        
        nafath_data = {
            "national_id": self.test_national_id,
            "phone_number": self.test_phone
        }
        
        success, status, data = self.make_request('POST', 'auth/nafath/verify', nafath_data)
        nafath_verified = success and data.get('success') == True
        return self.log_test(
            "Nafath Verification", 
            nafath_verified,
            f"Status: {status}, Success: {data.get('success')}, Message: {data.get('message', '')}"
        )

    def test_invalid_otp(self):
        """Test invalid OTP handling"""
        verify_data = {
            "phone_number": self.test_phone,
            "otp_code": "000000",  # Invalid OTP
            "user_type": "visitor"
        }
        
        success, status, data = self.make_request('POST', 'auth/verify-otp', verify_data, expected_status=400)
        invalid_handled = success  # Should return 400 for invalid OTP
        return self.log_test(
            "Invalid OTP Handling", 
            invalid_handled,
            f"Status: {status}, Error handled correctly"
        )

    def test_user_registration(self):
        """Test user registration"""
        registration_data = {
            "phone_number": "0509876543",  # Different phone number
            "user_type": "property_seeker",
            "full_name_arabic": "محمد أحمد السعودي",
            "email": "test@example.com",
            "preferred_language": "ar"
        }
        
        success, status, data = self.make_request('POST', 'auth/register', registration_data)
        registration_success = success and data.get('success') == True
        return self.log_test(
            "User Registration", 
            registration_success,
            f"Status: {status}, Success: {data.get('success')}, User ID: {data.get('user_id', 'N/A')}"
        )

    def test_cors_headers(self):
        """Test CORS headers"""
        try:
            response = requests.options(f"{self.api_url}/health", timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            }
            
            has_cors = any(header.lower().replace('-', '_') in [h.lower().replace('-', '_') for h in response.headers] 
                          for header in cors_headers)
            
            return self.log_test(
                "CORS Headers", 
                has_cors,
                f"Status: {response.status_code}, CORS headers present"
            )
        except Exception as e:
            return self.log_test("CORS Headers", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Onwan Real Estate Platform Backend Tests")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 Basic Connectivity Tests:")
        self.test_health_check()
        self.test_root_endpoint()
        self.test_user_types()
        self.test_cors_headers()
        
        # Authentication flow tests
        print("\n🔐 Authentication Flow Tests:")
        self.test_send_otp()
        time.sleep(1)  # Brief pause between OTP send and verify
        self.test_verify_otp()
        
        # Authenticated endpoints tests
        print("\n👤 Authenticated Endpoints Tests:")
        self.test_get_profile()
        self.test_nafath_verification()
        
        # Error handling tests
        print("\n⚠️ Error Handling Tests:")
        self.test_invalid_otp()
        
        # Additional functionality tests
        print("\n➕ Additional Functionality Tests:")
        self.test_user_registration()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return 0
        else:
            print("⚠️ Some tests failed. Please check the backend implementation.")
            return 1

def main():
    """Main test execution"""
    print("Onwan Real Estate Platform - Backend API Testing")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = OnwanAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())