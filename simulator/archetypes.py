import uuid
import random
from datetime import datetime, timedelta
from config import RESOURCES, IPS, GEO_LOCATIONS

class UserArchetype:
    def __init__(self, user_id, username, department):
        self.user_id = user_id
        self.username = username
        self.department = department
        self.session_id = str(uuid.uuid4())
        self.event_counter = 0

    def generate_event(self) -> dict:
        raise NotImplementedError

class NormalEmployee(UserArchetype):
    def __init__(self, user_id, username, department):
        super().__init__(user_id, username, department)
        self.usual_ips = random.sample(IPS['normal'], k=random.randint(1, 2))
        
    def generate_event(self) -> dict:
        self.event_counter += 1
        
        # 9 AM to 6 PM bias
        hour = random.randint(9, 18)
        now = datetime.utcnow()
        dt = now.replace(hour=hour, minute=random.randint(0, 59))
        
        action_weights = {'login': 10, 'logout': 10, 'file_access': 40, 'file_download': 20, 'resource_access': 20}
        
        if random.random() < 0.01:
            action_type = 'failed_login'
        else:
            action_type = random.choices(list(action_weights.keys()), weights=list(action_weights.values()))[0]
            
        src_ip = random.choice(self.usual_ips)
        geo_location = random.choice(GEO_LOCATIONS['normal'])
        resource_id = random.choice(RESOURCES[self.department])
        volume_mb = round(random.uniform(0, 10), 2)
        
        return {
            "user_id": str(self.user_id),
            "action_type": action_type,
            "volume_mb": volume_mb,
            "src_ip": src_ip,
            "resource_id": resource_id,
            "geo_location": geo_location,
            "session_id": self.session_id,
            "timestamp": dt.isoformat() + "Z"
        }

class NightOwlDev(UserArchetype):
    def __init__(self, user_id, username, department):
        super().__init__(user_id, username, department)
        self.usual_ips = random.sample(IPS['normal'] + IPS['vpn'], k=random.randint(1, 2))
        
    def generate_event(self) -> dict:
        self.event_counter += 1
        
        # 10 PM to 4 AM
        hour = random.choice([22, 23, 0, 1, 2, 3, 4])
        now = datetime.utcnow()
        dt = now.replace(hour=hour, minute=random.randint(0, 59))
        
        action_weights = {'login': 5, 'logout': 5, 'file_access': 45, 'file_download': 25, 'resource_access': 25}
        
        if random.random() < 0.01:
            action_type = 'failed_login'
        else:
            action_type = random.choices(list(action_weights.keys()), weights=list(action_weights.values()))[0]
            
        src_ip = random.choice(self.usual_ips)
        geo_location = random.choice(GEO_LOCATIONS['normal'])
        resource_id = random.choice(RESOURCES['Engineering']) # Accesses Engineering only
        volume_mb = round(random.uniform(10, 50), 2)
        
        return {
            "user_id": str(self.user_id),
            "action_type": action_type,
            "volume_mb": volume_mb,
            "src_ip": src_ip,
            "resource_id": resource_id,
            "geo_location": geo_location,
            "session_id": self.session_id,
            "timestamp": dt.isoformat() + "Z"
        }

class DisgruntledEmployee(UserArchetype):
    def __init__(self, user_id, username, department):
        super().__init__(user_id, username, department)
        self.usual_ips = random.sample(IPS['normal'], k=random.randint(1, 2))
        self.total_events = random.randint(50, 150) # Arbitrary session length
        
    def generate_event(self) -> dict:
        self.event_counter += 1
        progress = self.event_counter / max(1, self.total_events)
        
        now = datetime.utcnow()
        
        if progress > 0.7:
            # Phase 2: spike
            hour = random.randint(1, 5)
            dt = now.replace(hour=hour, minute=random.randint(0, 59))
            action_type = 'file_download' if random.random() < 0.6 else 'resource_access'
            all_resources = [res for dept_res in RESOURCES.values() for res in dept_res]
            resource_id = random.choice(all_resources) # Cross department snooping
            volume_mb = round(random.uniform(50, 200), 2)
        else:
            # Phase 1: normal
            hour = random.randint(9, 18)
            dt = now.replace(hour=hour, minute=random.randint(0, 59))
            action_weights = {'login': 5, 'logout': 5, 'file_access': 40, 'file_download': 30, 'resource_access': 20}
            action_type = random.choices(list(action_weights.keys()), weights=list(action_weights.values()))[0]
            resource_id = random.choice(RESOURCES[self.department])
            volume_mb = round(random.uniform(5, 25), 2)
            
        src_ip = random.choice(self.usual_ips)
        geo_location = random.choice(GEO_LOCATIONS['normal'])
        
        return {
            "user_id": str(self.user_id),
            "action_type": action_type,
            "volume_mb": volume_mb,
            "src_ip": src_ip,
            "resource_id": resource_id,
            "geo_location": geo_location,
            "session_id": self.session_id,
            "timestamp": dt.isoformat() + "Z"
        }

class CompromisedAccount(UserArchetype):
    def __init__(self, user_id, username, department):
        super().__init__(user_id, username, department)
        
    def generate_event(self) -> dict:
        self.event_counter += 1
        
        hour = random.randint(2, 5)
        now = datetime.utcnow()
        dt = now.replace(hour=hour, minute=random.randint(0, 59))
        
        action_weights = {'failed_login': 30, 'login': 10, 'file_download': 35, 'resource_access': 25}
        action_type = random.choices(list(action_weights.keys()), weights=list(action_weights.values()))[0]
        
        src_ip = random.choice(IPS['suspicious'])
        geo_location = random.choice(GEO_LOCATIONS['suspicious'] + GEO_LOCATIONS['normal'])
        
        all_resources = [res for dept_res in RESOURCES.values() for res in dept_res]
        resource_id = random.choice(all_resources)
        volume_mb = round(random.uniform(50, 500), 2)
        
        return {
            "user_id": str(self.user_id),
            "action_type": action_type,
            "volume_mb": volume_mb,
            "src_ip": src_ip,
            "resource_id": resource_id,
            "geo_location": geo_location,
            "session_id": self.session_id,
            "timestamp": dt.isoformat() + "Z"
        }

class NegligentUser(UserArchetype):
    def __init__(self, user_id, username, department):
        super().__init__(user_id, username, department)
        
    def generate_event(self) -> dict:
        self.event_counter += 1
        
        # Mostly normal, occasionally off-hours
        hour = random.randint(9, 18) if random.random() < 0.8 else random.randint(19, 23)
        now = datetime.utcnow()
        dt = now.replace(hour=hour, minute=random.randint(0, 59))
        
        action_weights = {'login': 15, 'file_access': 35, 'file_download': 25, 'resource_access': 25}
        
        if random.random() < 0.10:
            action_type = 'failed_login'
        else:
            action_type = random.choices(list(action_weights.keys()), weights=list(action_weights.values()))[0]
            
        # Multiple concurrent IPs (credential sharing)
        src_ip = random.choice(random.sample(IPS['normal'], min(5, len(IPS['normal']))))
        geo_location = random.choice(GEO_LOCATIONS['normal'] + [random.choice(GEO_LOCATIONS['suspicious'])])
        
        all_resources = [res for dept_res in RESOURCES.values() for res in dept_res]
        resource_id = random.choice(all_resources)
        volume_mb = round(random.uniform(10, 50), 2)
        
        return {
            "user_id": str(self.user_id),
            "action_type": action_type,
            "volume_mb": volume_mb,
            "src_ip": src_ip,
            "resource_id": resource_id,
            "geo_location": geo_location,
            "session_id": self.session_id,
            "timestamp": dt.isoformat() + "Z"
        }
