def get_peer_group_id(department: str) -> int:
    mapping = {
        "Engineering": 0,
        "Finance": 1,
        "HR": 2,
        "IT-Admin": 3,
        "Sales": 4
    }
    return mapping.get(department, 0) # Default to 0 if not found

def assign_peer_groups(users: list) -> dict:
    result = {}
    for user in users:
        result[user.id] = get_peer_group_id(user.department)
    return result
